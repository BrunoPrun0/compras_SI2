import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Not, QueryFailedError, Repository } from 'typeorm';
import { ErrorDominio, noEncontrado } from '../common/errores';
import { aFechaHora } from '../common/fechas';
import { Paginado, saltar } from '../common/paginacion.dto';
import { normalizarRut } from '../common/rut';
import { ESTADOS_OC, EstadoOc, OrdenCompra } from '../ordenes/orden.entity';
import {
  ActualizarProveedorDto,
  CrearProveedorDto,
  ListarProveedoresQuery,
  ProveedorDetalleDto,
  ProveedorDto,
} from './proveedor.dto';
import { EstadoProveedor, Proveedor } from './proveedor.entity';

@Injectable()
export class ProveedoresService {
  constructor(
    @InjectRepository(Proveedor) private readonly repo: Repository<Proveedor>,
    @InjectRepository(OrdenCompra) private readonly ordenes: Repository<OrdenCompra>,
  ) {}

  async listar(q: ListarProveedoresQuery): Promise<Paginado<ProveedorDto>> {
    const qb = this.repo.createQueryBuilder('p');
    if (q.estado) qb.andWhere('p.estado = :estado', { estado: q.estado });
    const texto = q.q?.trim();
    if (texto) {
      qb.andWhere('(p.razon_social ILIKE :q OR p.rut_nit ILIKE :rut)', {
        q: `%${texto}%`,
        rut: `%${texto.replace(/[.\s]/g, '')}%`,
      });
    }
    const [filas, total] = await qb
      .orderBy('p.razon_social')
      .addOrderBy('p.id_proveedor')
      .skip(saltar(q))
      .take(q.pageSize)
      .getManyAndCount();
    return { items: filas.map(aDto), total, page: q.page, pageSize: q.pageSize };
  }

  async detalle(id: number): Promise<ProveedorDetalleDto> {
    const proveedor = await this.obtener(id);
    const filas = await this.ordenes
      .createQueryBuilder('o')
      .select('o.estado', 'estado')
      .addSelect('COUNT(*)::int', 'cantidad')
      .addSelect('COALESCE(SUM(o.total), 0)', 'monto')
      .addSelect('MAX(o.fecha_emision)', 'ultima')
      .where('o.id_proveedor = :id', { id })
      .groupBy('o.estado')
      .getRawMany<{ estado: EstadoOc; cantidad: number; monto: number; ultima: Date | null }>();

    const cantidadPorEstado = Object.fromEntries(ESTADOS_OC.map((e) => [e, 0])) as Record<
      EstadoOc,
      number
    >;
    let montoComprado = 0;
    let ultima: Date | null = null;
    for (const f of filas) {
      cantidadPorEstado[f.estado] = f.cantidad;
      if (f.estado === 'EMITIDA' || f.estado === 'COMPLETADA') montoComprado += Number(f.monto);
      if (f.ultima && (!ultima || f.ultima > ultima)) ultima = f.ultima;
    }
    return {
      ...aDto(proveedor),
      resumenOc: { cantidadPorEstado, montoComprado, ultimaEmision: aFechaHora(ultima) },
    };
  }

  async crear(dto: CrearProveedorDto): Promise<ProveedorDto> {
    const rutNit = await this.validarRut(dto.rutNit);
    const nuevo = this.repo.create({
      rutNit,
      razonSocial: dto.razonSocial,
      email: dto.email ?? null,
      telefono: dto.telefono ?? null,
      direccion: dto.direccion ?? null,
      estado: 'ACTIVO',
    });
    return aDto(await this.guardar(nuevo));
  }

  async actualizar(id: number, dto: ActualizarProveedorDto): Promise<ProveedorDto> {
    const proveedor = await this.obtener(id);
    if (dto.rutNit !== undefined) proveedor.rutNit = await this.validarRut(dto.rutNit, id);
    if (dto.razonSocial !== undefined) proveedor.razonSocial = dto.razonSocial;
    if (dto.email !== undefined) proveedor.email = dto.email;
    if (dto.telefono !== undefined) proveedor.telefono = dto.telefono;
    if (dto.direccion !== undefined) proveedor.direccion = dto.direccion;
    return aDto(await this.guardar(proveedor));
  }

  /** Desactivar no borra nada: el proveedor conserva su historial y sus OC. */
  async cambiarEstado(id: number, estado: EstadoProveedor): Promise<ProveedorDto> {
    const proveedor = await this.obtener(id);
    proveedor.estado = estado;
    return aDto(await this.repo.save(proveedor));
  }

  private async obtener(id: number): Promise<Proveedor> {
    const p = await this.repo.findOneBy({ idProveedor: id });
    if (!p) throw noEncontrado('Proveedor', id);
    return p;
  }

  /** V1: RUT válido (módulo 11) y único. Devuelve el RUT normalizado. */
  private async validarRut(entrada: string, idExcluir?: number): Promise<string> {
    const rut = normalizarRut(entrada);
    if (!rut) {
      throw new ErrorDominio('PROVEEDOR_RUT_INVALIDO', `El RUT "${entrada}" no es válido`, {
        rutNit: entrada,
      });
    }
    const existente = await this.repo.findOneBy({
      rutNit: rut,
      ...(idExcluir ? { idProveedor: Not(idExcluir) } : {}),
    });
    if (existente) throw rutDuplicado(rut, existente.idProveedor);
    return rut;
  }

  /** La restricción UNIQUE de la BD cubre la carrera entre dos altas simultáneas. */
  private async guardar(p: Proveedor): Promise<Proveedor> {
    try {
      return await this.repo.save(p);
    } catch (e) {
      if (e instanceof QueryFailedError && (e.driverError as { code?: string }).code === '23505') {
        throw rutDuplicado(p.rutNit);
      }
      throw e;
    }
  }
}

const rutDuplicado = (rut: string, idProveedor?: number) =>
  new ErrorDominio('PROVEEDOR_RUT_DUPLICADO', `Ya existe un proveedor con RUT ${rut}`, {
    rutNit: rut,
    ...(idProveedor ? { idProveedor } : {}),
  });

const aDto = (p: Proveedor): ProveedorDto => ({
  idProveedor: p.idProveedor,
  rutNit: p.rutNit,
  razonSocial: p.razonSocial,
  email: p.email,
  telefono: p.telefono,
  direccion: p.direccion,
  estado: p.estado,
});
