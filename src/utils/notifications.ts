import Swal, { type SweetAlertIcon } from 'sweetalert2'

const titles: Record<SweetAlertIcon, string> = {
  success: '¡Listo!',
  error: 'Ocurrió un problema',
  warning: 'Atención',
  info: 'Información',
  question: 'Confirmación',
}

export function showNotice(
  message: string,
  icon: SweetAlertIcon = 'info',
  title = titles[icon],
) {
  return Swal.fire({
    title,
    text: message,
    icon,
    confirmButtonText: 'Entendido',
    confirmButtonColor: '#c91470',
    background: '#ffffff',
    color: '#1b191d',
  })
}
