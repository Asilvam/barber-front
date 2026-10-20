import Swal, { type SweetAlertIcon } from 'sweetalert2'
import { palette } from '../palette'

export const appDialog = Swal.mixin({
  confirmButtonColor: palette.primary,
  cancelButtonColor: palette.secondary,
  iconColor: palette.primary,
  background: palette.panel,
  color: palette.charcoal,
  customClass: {
    popup: 'shalo-dialog',
    confirmButton: 'shalo-dialog-confirm',
    cancelButton: 'shalo-dialog-cancel',
  },
})

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
  return appDialog.fire({
    title,
    text: message,
    icon,
    confirmButtonText: 'Entendido',
  })
}
