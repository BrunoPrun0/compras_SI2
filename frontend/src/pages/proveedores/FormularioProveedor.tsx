import { useState, type FormEvent } from 'react';
import { aErrorApi } from '../../api/cliente';
import { actualizarProveedor, crearProveedor } from '../../api/compras';
import { Alerta, Modal } from '../../components/ui';
import type { Proveedor, ProveedorEntrada } from '../../types/api';
import { rutConPuntos, rutValido } from '../../utils/formato';

type Campo = keyof ProveedorEntrada;

interface Props {
  /** Si viene, se edita ese proveedor; si no, se crea uno nuevo. */
  proveedor?: Proveedor;
  onCerrar: () => void;
  onGuardado: (p: Proveedor) => void;
}

const vacio = (v: string) => (v.trim() === '' ? null : v.trim());

export function FormularioProveedor({ proveedor, onCerrar, onGuardado }: Props) {
  const [valores, setValores] = useState({
    rutNit: proveedor ? rutConPuntos(proveedor.rutNit) : '',
    razonSocial: proveedor?.razonSocial ?? '',
    email: proveedor?.email ?? '',
    telefono: proveedor?.telefono ?? '',
    direccion: proveedor?.direccion ?? '',
  });
  const [errores, setErrores] = useState<Partial<Record<Campo, string>>>({});
  const [errorGeneral, setErrorGeneral] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);

  const cambiar = (campo: Campo, valor: string) => {
    setValores((v) => ({ ...v, [campo]: valor }));
    setErrores((e) => ({ ...e, [campo]: undefined }));
  };

  /** Validación en el navegador solo para feedback rápido; la que manda es la del servidor (RT2). */
  const validarLocal = () => {
    const e: Partial<Record<Campo, string>> = {};
    if (!valores.rutNit.trim()) e.rutNit = 'El RUT es obligatorio';
    else if (!rutValido(valores.rutNit)) e.rutNit = 'RUT inválido (revisa el dígito verificador)';
    if (!valores.razonSocial.trim()) e.razonSocial = 'La razón social es obligatoria';
    if (valores.email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(valores.email.trim()))
      e.email = 'Correo inválido';
    setErrores(e);
    return Object.keys(e).length === 0;
  };

  const guardar = async (ev: FormEvent) => {
    ev.preventDefault();
    setErrorGeneral(null);
    if (!validarLocal()) return;

    const datos: ProveedorEntrada = {
      rutNit: valores.rutNit.trim(),
      razonSocial: valores.razonSocial.trim(),
      email: vacio(valores.email),
      telefono: vacio(valores.telefono),
      direccion: vacio(valores.direccion),
    };
    setGuardando(true);
    try {
      const guardado = proveedor
        ? await actualizarProveedor(proveedor.idProveedor, datos)
        : await crearProveedor(datos);
      onGuardado(guardado);
    } catch (e) {
      const err = aErrorApi(e);
      if (err.code === 'PROVEEDOR_RUT_INVALIDO' || err.code === 'PROVEEDOR_RUT_DUPLICADO') {
        setErrores({ rutNit: err.message });
      } else if (err.code === 'VALIDACION' && Array.isArray(err.details?.errores)) {
        // details.errores = [{campo, errores[]}]
        const porCampo: Partial<Record<Campo, string>> = {};
        for (const { campo, errores: msgs } of err.details.errores as {
          campo: Campo;
          errores: string[];
        }[]) {
          porCampo[campo] = msgs.join('. ');
        }
        setErrores(porCampo);
      } else {
        setErrorGeneral(err.message);
      }
    } finally {
      setGuardando(false);
    }
  };

  const campo = (
    nombre: Campo,
    etiqueta: string,
    extra: { obligatorio?: boolean; placeholder?: string; tipo?: string } = {},
  ) => (
    <label className={`campo ${errores[nombre] ? 'campo-con-error' : ''}`}>
      <span className="campo-etiqueta">
        {etiqueta}
        {extra.obligatorio && <span className="obligatorio"> *</span>}
      </span>
      <input
        className="input"
        type={extra.tipo ?? 'text'}
        value={valores[nombre] ?? ''}
        placeholder={extra.placeholder}
        onChange={(e) => cambiar(nombre, e.target.value)}
      />
      {errores[nombre] && <span className="campo-error">{errores[nombre]}</span>}
    </label>
  );

  return (
    <Modal
      titulo={proveedor ? `Editar proveedor` : 'Nuevo proveedor'}
      onCerrar={onCerrar}
      pie={
        <>
          <button type="button" className="btn btn-secundario" onClick={onCerrar}>
            Cancelar
          </button>
          <button
            type="submit"
            form="form-proveedor"
            className="btn btn-primario"
            disabled={guardando}
          >
            {guardando ? 'Guardando…' : 'Guardar'}
          </button>
        </>
      }
    >
      <form id="form-proveedor" className="form-grid" onSubmit={guardar} noValidate>
        {errorGeneral && (
          <div className="form-ancho-completo">
            <Alerta>{errorGeneral}</Alerta>
          </div>
        )}
        {campo('rutNit', 'RUT', { obligatorio: true, placeholder: '76.123.456-0' })}
        {campo('razonSocial', 'Razón social', {
          obligatorio: true,
          placeholder: 'Distribuidora Ejemplo SpA',
        })}
        {campo('email', 'Correo', { tipo: 'email', placeholder: 'ventas@proveedor.cl' })}
        {campo('telefono', 'Teléfono', { placeholder: '+56 2 2345 6789' })}
        <div className="form-ancho-completo">
          {campo('direccion', 'Dirección', { placeholder: 'Av. Ejemplo 123, Santiago' })}
        </div>
      </form>
    </Modal>
  );
}
