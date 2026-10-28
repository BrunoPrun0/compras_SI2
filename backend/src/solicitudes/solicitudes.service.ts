import { Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource, EntityManager } from 'typeorm';
import { EmpleadosRepository } from '../auth/empleados.repository';
import { puedeVerTodo, UsuarioAutenticado } from '../auth/roles';
import { ProductoDto } from '../catalogo/producto.dto';
import { patronContiene } from '../common/busqueda';
import { ErrorDominio, noEncontrado, sinPermiso } from '../common/errores';
import { aFechaHora, sqlFinDiaLocal, sqlInicioDiaLocal } from '../common/fechas';
import { generarFolio } from '../common/folios';
import { validarTransicion } from '../common/maquina-estados';
import { Paginado, saltar } from '../common/paginacion.dto';
import { HistorialService } from '../historial/historial.service';
import { ProductosInventarioService } from '../integracion/inventario/productos-inventario.service';
import { OrdenDetalle } from '../ordenes/orden.entity';
import { AccionSc, MAQUINA_SC } from './sc.maquina';
import { LineaEntrada, mensajeEnvio, revisarEnvio, validarLineasUnicas } from './sc.reglas';
import {
  ActualizarSolicitudDto,
  CrearSolicitudDto,
  DuplicadoScDto,
  EnviarSolicitudDto,
  ListarSolicitudesQuery,
  SolicitudDetalleDto,
  SolicitudResumenDto,
} from './solicitud.dto';
import { Solicitud, SolicitudDetalle } from './solicitud.entity';

/** Roles que ven todas las SC (el resto solo ve las propias). */
const ROLES_VEN_TODAS = ['GESTOR_SC', 'COMPRADOR', 'ADMIN'] as const;

@Injectable()
export class SolicitudesService {
  constructor(
    @InjectDataSource() private readonly ds: DataSource,
    private readonly productos: ProductosInventarioService,
    private readonly empleados: EmpleadosRepository,
    private readonly historial: HistorialService,
  ) {}

  // ---------- Consultas ----------

  async listar(
    q: ListarSolicitudesQuery,
    usuario: UsuarioAutenticado,
  ): Promise<Paginado<SolicitudResumenDto>> {
    const qb = this.ds.getRepository(Solicitud).createQueryBuilder('sc');

    const idSolicitante = puedeVerTodo(usuario, ...ROLES_VEN_TODAS)
      ? q.idSolicitante
      : usuario.idEmpleado;
    if (idSolicitante !== undefined)
      qb.andWhere('sc.id_empleado = :idSolicitante', { idSolicitante });
    if (q.estado) qb.andWhere('sc.estado = :estado', { estado: q.estado });
    if (q.idProducto !== undefined) {
      qb.andWhere(
        'EXISTS (SELECT 1 FROM compras.compras_sc_detalle d WHERE d.id_solicitud = sc.id_solicitud AND d.id_producto = :idProducto)',
        { idProducto: q.idProducto },
      );
    }
    if (q.desde)
      qb.andWhere(`sc.fecha_solicitud >= ${sqlInicioDiaLocal('desde')}`, { desde: q.desde });
    if (q.hasta) qb.andWhere(`sc.fecha_solicitud < ${sqlFinDiaLocal('hasta')}`, { hasta: q.hasta });
    if (q.q?.trim())
      qb.andWhere('(sc.folio ILIKE :q OR sc.motivo ILIKE :q)', { q: patronContiene(q.q.trim()) });

    const [filas, total] = await qb
      .orderBy('sc.fecha_solicitud', 'DESC')
      .addOrderBy('sc.id_solicitud', 'DESC')
      .skip(saltar(q))
      .take(q.pageSize)
      .getManyAndCount();

    const [empleados, lineasPorSc] = await Promise.all([
      this.empleados.porIds(filas.map((f) => f.idEmpleado)),
      this.contarLineas(filas.map((f) => f.idSolicitud)),
    ]);
    return {
      items: filas.map((sc) =>
        this.aResumen(sc, empleados.get(sc.idEmpleado)!, lineasPorSc.get(sc.idSolicitud) ?? 0),
      ),
      total,
      page: q.page,
      pageSize: q.pageSize,
    };
  }

  async detalle(id: number, usuario: UsuarioAutenticado): Promise<SolicitudDetalleDto> {
    const sc = await this.ds.getRepository(Solicitud).findOneBy({ idSolicitud: id });
    if (!sc) throw noEncontrado('Solicitud', id);
    if (sc.idEmpleado !== usuario.idEmpleado && !puedeVerTodo(usuario, ...ROLES_VEN_TODAS)) {
      throw sinPermiso('Solo puedes ver tus propias solicitudes');
    }
    return this.armarDetalle(this.ds.manager, sc);
  }

  /** V3: líneas en SC PENDIENTE, o APROBADA sin OC activa, que incluyen esos productos. */
  async duplicados(
    idsProducto: number[],
    excluirSc?: number,
    manager = this.ds.manager,
  ): Promise<DuplicadoScDto[]> {
    if (idsProducto.length === 0) return [];
    const qb = manager
      .getRepository(SolicitudDetalle)
      .createQueryBuilder('d')
      .innerJoinAndSelect('d.solicitud', 'sc')
      .where('d.id_producto IN (:...ids)', { ids: [...new Set(idsProducto)] })
      .andWhere(
        `(sc.estado = 'PENDIENTE' OR (sc.estado = 'APROBADA' AND NOT EXISTS (
            SELECT 1 FROM compras.compras_detalle od
            JOIN compras.compras_oc o ON o.id_oc = od.id_oc
            WHERE od.id_sc_detalle = d.id_sc_detalle AND o.estado <> 'CANCELADA')))`,
      );
    if (excluirSc !== undefined) qb.andWhere('sc.id_solicitud <> :excluirSc', { excluirSc });
    const lineas = await qb.orderBy('sc.id_solicitud').addOrderBy('d.id_sc_detalle').getMany();

    const productos = await this.productos.porIds(
      lineas.map((l) => l.idProducto),
      manager,
    );
    return lineas.map((l) => ({
      idSolicitud: l.solicitud.idSolicitud,
      folio: l.solicitud.folio ?? '',
      estado: l.solicitud.estado,
      producto: productos.get(l.idProducto) ?? productoDesconocido(l.idProducto),
      cantidad: l.cantidad,
    }));
  }

  // ---------- Comandos ----------

  async crear(dto: CrearSolicitudDto, usuario: UsuarioAutenticado): Promise<SolicitudDetalleDto> {
    const lineas = dto.lineas ?? [];
    await this.validarLineas(lineas);
    if (!dto.confirmarDuplicado) await this.exigirSinDuplicados(lineas);

    const id = await this.ds.transaction(async (m) => {
      const { idSolicitud } = await m.save(
        m.create(Solicitud, {
          idEmpleado: usuario.idEmpleado,
          motivo: dto.motivo ?? null,
          estado: 'BORRADOR',
        }),
      );
      // El folio usa el id y la fecha que asignó la BD, dentro de la misma transacción
      const { fechaSolicitud } = await m.findOneByOrFail(Solicitud, { idSolicitud });
      await m.update(
        Solicitud,
        { idSolicitud },
        { folio: generarFolio('SC', fechaSolicitud, idSolicitud) },
      );
      if (lineas.length) {
        await m.insert(
          SolicitudDetalle,
          lineas.map((l) => ({ idSolicitud, idProducto: l.idProducto, cantidad: l.cantidad })),
        );
      }
      await this.historial.registrar(m, {
        tipo: 'SC',
        idDocumento: idSolicitud,
        estadoAnterior: null,
        estadoNuevo: 'BORRADOR',
        idEmpleado: usuario.idEmpleado,
      });
      return idSolicitud;
    });
    return this.detalle(id, usuario);
  }

  async actualizar(
    id: number,
    dto: ActualizarSolicitudDto,
    usuario: UsuarioAutenticado,
  ): Promise<SolicitudDetalleDto> {
    if (dto.lineas) await this.validarLineas(dto.lineas);

    await this.ds.transaction(async (m) => {
      const sc = await this.bloquear(m, id);
      this.validar(sc, 'editar', usuario);

      if (dto.motivo !== undefined)
        await m.update(Solicitud, { idSolicitud: id }, { motivo: dto.motivo });
      if (dto.lineas) await this.reemplazarLineas(m, id, dto.lineas);
    });
    return this.detalle(id, usuario);
  }

  async enviar(
    id: number,
    dto: EnviarSolicitudDto,
    usuario: UsuarioAutenticado,
  ): Promise<SolicitudDetalleDto> {
    await this.ds.transaction(async (m) => {
      const sc = await this.bloquear(m, id);
      const regla = this.validar(sc, 'enviar', usuario);

      // V2
      const lineas = await m.findBy(SolicitudDetalle, { idSolicitud: id });
      const productos = await this.productos.porIds(
        lineas.map((l) => l.idProducto),
        m,
      );
      const problemas = revisarEnvio(sc.motivo, lineas, productos);
      if (problemas) throw new ErrorDominio('SC_INCOMPLETA', mensajeEnvio(problemas), problemas);

      // V3
      if (!dto.confirmarDuplicado) {
        await this.exigirSinDuplicados(lineas, id, m);
      }

      await this.cambiarEstado(m, sc, regla.hacia, usuario);
    });
    return this.detalle(id, usuario);
  }

  async anular(id: number, usuario: UsuarioAutenticado): Promise<SolicitudDetalleDto> {
    await this.ds.transaction(async (m) => {
      const sc = await this.bloquear(m, id);
      const regla = this.validar(sc, 'anular', usuario);
      await this.cambiarEstado(m, sc, regla.hacia, usuario);
    });
    return this.detalle(id, usuario);
  }

  // ---------- Internos ----------

  /** SELECT ... FOR UPDATE de la cabecera: serializa las transiciones sobre la misma SC. */
  private async bloquear(m: EntityManager, id: number): Promise<Solicitud> {
    const sc = await m
      .getRepository(Solicitud)
      .createQueryBuilder('sc')
      .setLock('pessimistic_write')
      .where('sc.id_solicitud = :id', { id })
      .getOne();
    if (!sc) throw noEncontrado('Solicitud', id);
    return sc;
  }

  private validar(sc: Solicitud, accion: AccionSc, usuario: UsuarioAutenticado) {
    return validarTransicion(MAQUINA_SC, accion, {
      estadoActual: sc.estado,
      usuario,
      idDueno: sc.idEmpleado,
    });
  }

  private async cambiarEstado(
    m: EntityManager,
    sc: Solicitud,
    nuevo: Solicitud['estado'],
    usuario: UsuarioAutenticado,
    comentario?: string,
  ): Promise<void> {
    await m.update(Solicitud, { idSolicitud: sc.idSolicitud }, { estado: nuevo });
    await this.historial.registrar(m, {
      tipo: 'SC',
      idDocumento: sc.idSolicitud,
      estadoAnterior: sc.estado,
      estadoNuevo: nuevo,
      idEmpleado: usuario.idEmpleado,
      comentario,
    });
  }

  /** Sin productos repetidos y todos existentes en el catálogo (activos o no: eso se exige al enviar). */
  private async validarLineas(lineas: LineaEntrada[]): Promise<void> {
    validarLineasUnicas(lineas);
    const productos = await this.productos.porIds(lineas.map((l) => l.idProducto));
    const inexistentes = lineas.map((l) => l.idProducto).filter((id) => !productos.has(id));
    if (inexistentes.length) {
      throw new ErrorDominio('VALIDACION', 'Hay productos que no existen en el catálogo', {
        productosInexistentes: inexistentes,
      });
    }
  }

  private async exigirSinDuplicados(lineas: LineaEntrada[], excluirSc?: number, m?: EntityManager) {
    const duplicados = await this.duplicados(
      lineas.map((l) => l.idProducto),
      excluirSc,
      m,
    );
    if (duplicados.length) {
      throw new ErrorDominio(
        'SC_POSIBLE_DUPLICADO',
        'Hay otras solicitudes pendientes o aprobadas con estos productos. Confirma para continuar.',
        { duplicados },
      );
    }
  }

  /** Deja exactamente las líneas recibidas conservando el id de las que siguen (solo BORRADOR). */
  private async reemplazarLineas(m: EntityManager, idSolicitud: number, nuevas: LineaEntrada[]) {
    const actuales = await m.findBy(SolicitudDetalle, { idSolicitud });
    const porProducto = new Map(nuevas.map((l) => [l.idProducto, l.cantidad]));

    const quitar = actuales.filter((a) => !porProducto.has(a.idProducto)).map((a) => a.idScDetalle);
    if (quitar.length) await m.delete(SolicitudDetalle, quitar);

    for (const a of actuales) {
      const cantidad = porProducto.get(a.idProducto);
      if (cantidad !== undefined && cantidad !== a.cantidad) {
        await m.update(SolicitudDetalle, { idScDetalle: a.idScDetalle }, { cantidad });
      }
    }

    const existentes = new Set(actuales.map((a) => a.idProducto));
    const agregar = nuevas.filter((l) => !existentes.has(l.idProducto));
    if (agregar.length) {
      await m.insert(
        SolicitudDetalle,
        agregar.map((l) => ({ idSolicitud, idProducto: l.idProducto, cantidad: l.cantidad })),
      );
    }
  }

  private async armarDetalle(m: EntityManager, sc: Solicitud): Promise<SolicitudDetalleDto> {
    const lineas = await m.find(SolicitudDetalle, {
      where: { idSolicitud: sc.idSolicitud },
      order: { idScDetalle: 'ASC' },
    });
    const ids = lineas.map((l) => l.idScDetalle);
    const [productos, empleados, ocPorLinea, historial] = await Promise.all([
      this.productos.porIds(
        lineas.map((l) => l.idProducto),
        m,
      ),
      this.empleados.porIds([sc.idEmpleado, ...(sc.idGestor ? [sc.idGestor] : [])]),
      this.folioOcPorLinea(m, ids),
      this.historial.listar(m, 'SC', sc.idSolicitud),
    ]);

    return {
      ...this.aResumen(sc, empleados.get(sc.idEmpleado)!, lineas.length),
      lineas: lineas.map((l) => ({
        idScDetalle: l.idScDetalle,
        producto: productos.get(l.idProducto) ?? productoDesconocido(l.idProducto),
        cantidad: l.cantidad,
        folioOc: ocPorLinea.get(l.idScDetalle) ?? null,
      })),
      motivoRechazo: sc.motivoRechazo,
      gestor: sc.idGestor ? empleados.get(sc.idGestor)! : null,
      fechaResolucion: aFechaHora(sc.fechaResolucion),
      historial,
    };
  }

  private async contarLineas(idsSolicitud: number[]): Promise<Map<number, number>> {
    if (idsSolicitud.length === 0) return new Map();
    const filas = await this.ds
      .getRepository(SolicitudDetalle)
      .createQueryBuilder('d')
      .select('d.id_solicitud', 'id')
      .addSelect('COUNT(*)::int', 'cantidad')
      .where('d.id_solicitud IN (:...ids)', { ids: idsSolicitud })
      .groupBy('d.id_solicitud')
      .getRawMany<{ id: number; cantidad: number }>();
    return new Map(filas.map((f) => [f.id, f.cantidad]));
  }

  /** Folio de la OC no cancelada que usa cada línea de SC. */
  private async folioOcPorLinea(
    m: EntityManager,
    idsScDetalle: number[],
  ): Promise<Map<number, string>> {
    if (idsScDetalle.length === 0) return new Map();
    const filas = await m
      .getRepository(OrdenDetalle)
      .createQueryBuilder('od')
      .innerJoin('od.orden', 'o')
      .select('od.id_sc_detalle', 'id')
      .addSelect('o.folio', 'folio')
      .where('od.id_sc_detalle IN (:...ids)', { ids: idsScDetalle })
      .andWhere("o.estado <> 'CANCELADA'")
      .getRawMany<{ id: number; folio: string | null }>();
    return new Map(filas.filter((f) => f.folio).map((f) => [f.id, f.folio!]));
  }

  private aResumen(
    sc: Solicitud,
    solicitante: SolicitudResumenDto['solicitante'],
    cantidadLineas: number,
  ) {
    return {
      idSolicitud: sc.idSolicitud,
      folio: sc.folio ?? '',
      solicitante,
      fechaSolicitud: aFechaHora(sc.fechaSolicitud),
      motivo: sc.motivo,
      estado: sc.estado,
      cantidadLineas,
    } satisfies SolicitudResumenDto;
  }
}

/** Solo por si Inventario borra un producto que ya está en una SC (la FK lo impide hoy). */
const productoDesconocido = (idProducto: number): ProductoDto => ({
  idProducto,
  sku: '',
  nombre: `Producto ${idProducto}`,
  coleccion: '',
  cantPiezas: 0,
  activo: false,
  precioReferencia: null,
});
