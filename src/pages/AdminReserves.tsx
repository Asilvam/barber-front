import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import dayjs from 'dayjs'
import Box from '@mui/material/Box'
import Container from '@mui/material/Container'
import Typography from '@mui/material/Typography'
import Paper from '@mui/material/Paper'
import Alert from '@mui/material/Alert'
import CircularProgress from '@mui/material/CircularProgress'
import Stack from '@mui/material/Stack'
import Table from '@mui/material/Table'
import TableBody from '@mui/material/TableBody'
import TableCell from '@mui/material/TableCell'
import TableContainer from '@mui/material/TableContainer'
import TableHead from '@mui/material/TableHead'
import TableRow from '@mui/material/TableRow'
import TableSortLabel from '@mui/material/TableSortLabel'
import Chip from '@mui/material/Chip'
import FormControl from '@mui/material/FormControl'
import InputLabel from '@mui/material/InputLabel'
import Select from '@mui/material/Select'
import MenuItem from '@mui/material/MenuItem'
import TextField from '@mui/material/TextField'
import ArrowBackIcon from '@mui/icons-material/ArrowBack'
import Button from '@mui/material/Button'
import Snackbar from '@mui/material/Snackbar'
import IconButton from '@mui/material/IconButton'
import Tooltip from '@mui/material/Tooltip'
import useMediaQuery from '@mui/material/useMediaQuery'
import { useTheme } from '@mui/material/styles'
import Dialog from '@mui/material/Dialog'
import DialogTitle from '@mui/material/DialogTitle'
import DialogContent from '@mui/material/DialogContent'
import DialogActions from '@mui/material/DialogActions'
import EventNoteIcon from '@mui/icons-material/EventNote'
import PendingActionsIcon from '@mui/icons-material/PendingActions'
import CheckCircleIcon from '@mui/icons-material/CheckCircle'
import CancelIcon from '@mui/icons-material/Cancel'
import TaskAltIcon from '@mui/icons-material/TaskAlt'
import EditIcon from '@mui/icons-material/Edit'
import DeleteIcon from '@mui/icons-material/Delete'
import type { Barber } from '../api/barber'
import {
  deleteAppointment,
  fetchAdminAppointments,
  updateAppointmentStatus,
  type AdminAppointment,
  type AppointmentStatus,
} from '../api/appointments'

type SortKey = 'date' | 'timeSlot' | 'barber'
type SortDirection = 'asc' | 'desc'

const statusLabel: Record<AppointmentStatus, string> = {
  pending: 'Pendiente',
  confirmed: 'Confirmada',
  cancelled: 'Cancelada',
  completed: 'Completada',
}

const statusColor: Record<AppointmentStatus, 'warning' | 'success' | 'default' | 'error'> = {
  pending: 'warning',
  confirmed: 'success',
  cancelled: 'error',
  completed: 'default',
}

function getBarberName(barberId: string | Barber): string {
  if (typeof barberId === 'string') return barberId.slice(0, 8)
  return barberId.name
}

function getClientName(clientId: AdminAppointment['clientId']): string {
  if (typeof clientId === 'string') return clientId.slice(0, 8)
  return clientId.name
}

function getClientEmail(clientId: AdminAppointment['clientId']): string {
  if (typeof clientId === 'string') return ''
  return clientId.email
}

function isPastAppointment(appointment: AdminAppointment): boolean {
  const appointmentDateTime = dayjs(`${appointment.date} ${appointment.timeSlot}`)
  return appointmentDateTime.isBefore(dayjs())
}

export default function AdminReserves() {
  const navigate = useNavigate()
  const theme = useTheme()
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'))
  const [appointments, setAppointments] = useState<AdminAppointment[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [statusFilter, setStatusFilter] = useState<'all' | AppointmentStatus>('all')
  const [barberFilter, setBarberFilter] = useState<'all' | string>('all')
  const [clientQuery, setClientQuery] = useState('')
  const [sortKey, setSortKey] = useState<SortKey>('date')
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc')
  const [updatingId, setUpdatingId] = useState<string | null>(null)
  const [toast, setToast] = useState<string | null>(null)
  const [editingAppointment, setEditingAppointment] = useState<AdminAppointment | null>(null)
  const [statusDraft, setStatusDraft] = useState<AppointmentStatus>('pending')
  const [deletingAppointment, setDeletingAppointment] = useState<AdminAppointment | null>(null)

  useEffect(() => {
    let active = true
    fetchAdminAppointments()
      .then((data) => {
        if (!active) return
        setAppointments(data)
      })
      .catch((err) => {
        if (!active) return
        setError(err instanceof Error ? err.message : 'No se pudieron cargar las reservas')
      })
      .finally(() => {
        if (!active) return
        setLoading(false)
      })

    return () => {
      active = false
    }
  }, [])

  const barberOptions = useMemo(() => {
    const names = Array.from(new Set(appointments.map((a) => getBarberName(a.barberId))))
    names.sort((a, b) => a.localeCompare(b, 'es'))
    return names
  }, [appointments])

  const filteredAndSorted = useMemo(() => {
    const normalizedQuery = clientQuery.trim().toLowerCase()

    const filtered = appointments.filter((appointment) => {
      if (statusFilter !== 'all' && appointment.status !== statusFilter) {
        return false
      }

      const barberName = getBarberName(appointment.barberId)
      if (barberFilter !== 'all' && barberName !== barberFilter) {
        return false
      }

      const clientName = getClientName(appointment.clientId).toLowerCase()
      const clientEmail = getClientEmail(appointment.clientId).toLowerCase()
      if (normalizedQuery && !clientName.includes(normalizedQuery) && !clientEmail.includes(normalizedQuery)) {
        return false
      }

      return true
    })

    return filtered.sort((a, b) => {
      const aDateTime = `${a.date} ${a.timeSlot}`
      const bDateTime = `${b.date} ${b.timeSlot}`

      if (sortKey === 'date') {
        if (aDateTime !== bDateTime) {
          const cmp = aDateTime.localeCompare(bDateTime)
          return sortDirection === 'asc' ? cmp : -cmp
        }

        const barberCmp = getBarberName(a.barberId).localeCompare(getBarberName(b.barberId), 'es')
        return sortDirection === 'asc' ? barberCmp : -barberCmp
      }

      if (sortKey === 'timeSlot') {
        const cmp = a.timeSlot.localeCompare(b.timeSlot)
        if (cmp !== 0) return sortDirection === 'asc' ? cmp : -cmp

        const dateCmp = a.date.localeCompare(b.date)
        return sortDirection === 'asc' ? dateCmp : -dateCmp
      }

      const cmp = getBarberName(a.barberId).localeCompare(getBarberName(b.barberId), 'es')
      if (cmp !== 0) return sortDirection === 'asc' ? cmp : -cmp

      const dateCmp = aDateTime.localeCompare(bDateTime)
      return sortDirection === 'asc' ? dateCmp : -dateCmp
    })
  }, [appointments, statusFilter, barberFilter, clientQuery, sortKey, sortDirection])

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'))
      return
    }

    setSortKey(key)
    setSortDirection('asc')
  }

  const handleStatusChange = async (appointmentId: string, status: AppointmentStatus) => {
    const current = appointments.find((item) => item._id === appointmentId)
    if (current && isPastAppointment(current)) {
      setToast('No puedes editar una reserva pasada o vencida')
      return
    }

    setUpdatingId(appointmentId)
    try {
      const updated = await updateAppointmentStatus(appointmentId, status)
      setAppointments((prev) => prev.map((item) => (item._id === appointmentId ? updated : item)))
      setToast('Estado actualizado correctamente')
    } catch (err) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message
      setToast(msg ?? 'No se pudo actualizar el estado')
    } finally {
      setUpdatingId(null)
    }
  }

  const openEditStatus = (appointment: AdminAppointment) => {
    setEditingAppointment(appointment)
    setStatusDraft(appointment.status)
  }

  const handleConfirmEditStatus = async () => {
    if (!editingAppointment) return
    await handleStatusChange(editingAppointment._id, statusDraft)
    setEditingAppointment(null)
  }

  const handleDeleteAppointment = async () => {
    if (!deletingAppointment) return
    if (isPastAppointment(deletingAppointment)) {
      setToast('No puedes eliminar una reserva pasada o vencida')
      setDeletingAppointment(null)
      return
    }

    const appointmentId = deletingAppointment._id
    setUpdatingId(appointmentId)
    try {
      await deleteAppointment(appointmentId)
      setAppointments((prev) => prev.filter((item) => item._id !== appointmentId))
      setToast('Reserva eliminada correctamente')
    } catch (err) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message
      setToast(msg ?? 'No se pudo eliminar la reserva')
    } finally {
      setUpdatingId(null)
      setDeletingAppointment(null)
    }
  }

  const statusTotals = useMemo(() => {
    return appointments.reduce(
      (acc, item) => {
        acc[item.status] += 1
        return acc
      },
      {
        pending: 0,
        confirmed: 0,
        cancelled: 0,
        completed: 0,
      } as Record<AppointmentStatus, number>,
    )
  }, [appointments])

  return (
    <Box className="admin-bg">
      <Container maxWidth="xl" sx={{ py: { xs: 2, sm: 4 }, px: { xs: 1.5, sm: 3, lg: 4 } }}>
        <Paper
          elevation={0}
          sx={{
            p: { xs: 2, sm: 3, lg: 3.5 },
            mb: 2,
            borderRadius: 1,
            border: '1px solid',
            borderColor: 'divider',
            background:
              'linear-gradient(135deg, rgba(47,107,95,0.12) 0%, rgba(239,245,243,0.85) 55%, rgba(255,255,255,1) 100%)',
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1.5, flexWrap: 'wrap' }}>
            <Box>
              <Typography variant="h5" sx={{ fontWeight: 800, color: 'primary.dark' }}>
                Centro de Reservas
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                Gestiona citas ordenadas por proximidad y controla su estado en tiempo real.
              </Typography>
            </Box>
            <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
              <Chip
                icon={<EventNoteIcon />}
                label={`${appointments.length} reservas`}
                color="primary"
                variant="filled"
                sx={{ fontWeight: 700 }}
              />
            </Stack>
          </Box>
        </Paper>

        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2.2, gap: 1.5, flexWrap: 'wrap' }}>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1}>
            <Chip icon={<PendingActionsIcon />} label={`Pendientes: ${statusTotals.pending}`} color="warning" />
            <Chip icon={<CheckCircleIcon />} label={`Confirmadas: ${statusTotals.confirmed}`} color="success" />
            <Chip icon={<CancelIcon />} label={`Canceladas: ${statusTotals.cancelled}`} color="error" />
            <Chip icon={<TaskAltIcon />} label={`Completadas: ${statusTotals.completed}`} color="default" />
          </Stack>
          <Button
            variant="outlined"
            startIcon={<ArrowBackIcon />}
            onClick={() => navigate('/admin/barbers')}
            sx={{ borderRadius: 1, textTransform: 'none', fontWeight: 600 }}
          >
            Volver
          </Button>
        </Box>

        {error ? <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert> : null}

        <Paper
          elevation={0}
          sx={{
            border: '1px solid',
            borderColor: 'divider',
            borderRadius: 1,
            p: 2,
            mb: 2,
            bgcolor: 'rgba(255,255,255,0.86)',
            backdropFilter: 'blur(8px)',
          }}
        >
          <Box sx={{ display: 'grid', gap: 1.5, gridTemplateColumns: { xs: '1fr', md: '1fr 1fr 1fr' } }}>
            <FormControl size="small" fullWidth>
              <InputLabel>Estado</InputLabel>
              <Select label="Estado" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as 'all' | AppointmentStatus)}>
                <MenuItem value="all">Todos</MenuItem>
                <MenuItem value="pending">Pendiente</MenuItem>
                <MenuItem value="confirmed">Confirmada</MenuItem>
                <MenuItem value="cancelled">Cancelada</MenuItem>
                <MenuItem value="completed">Completada</MenuItem>
              </Select>
            </FormControl>

            <FormControl size="small" fullWidth>
              <InputLabel>Barbero</InputLabel>
              <Select label="Barbero" value={barberFilter} onChange={(e) => setBarberFilter(e.target.value as 'all' | string)}>
                <MenuItem value="all">Todos</MenuItem>
                {barberOptions.map((name) => (
                  <MenuItem key={name} value={name}>{name}</MenuItem>
                ))}
              </Select>
            </FormControl>

            <TextField
              size="small"
              label="Buscar cliente"
              value={clientQuery}
              onChange={(e) => setClientQuery(e.target.value)}
              fullWidth
            />
          </Box>
        </Paper>

        {isMobile ? (
          <Box sx={{ display: 'grid', gap: 1.1 }}>
            {loading ? (
              <Paper elevation={0} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 1, p: 3, textAlign: 'center' }}>
                <CircularProgress size={24} />
              </Paper>
            ) : filteredAndSorted.length === 0 ? (
              <Paper elevation={0} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 1, p: 3, textAlign: 'center' }}>
                <Typography variant="body2" color="text.secondary">
                  No hay reservas para los filtros seleccionados.
                </Typography>
              </Paper>
            ) : (
              filteredAndSorted.map((appointment) => {
                const isPast = isPastAppointment(appointment)
                return (
                  <Paper key={appointment._id} elevation={0} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 1, p: 1.5 }}>
                    <Stack spacing={0.8}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 1 }}>
                        <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                          {dayjs(appointment.date).format('DD/MM/YYYY')} · {appointment.timeSlot}
                        </Typography>
                        <Chip label={statusLabel[appointment.status]} color={statusColor[appointment.status]} size="small" sx={{ fontWeight: 600 }} />
                      </Box>
                      <Typography variant="body2" color="text.secondary">
                        <strong>Barbero:</strong> {getBarberName(appointment.barberId)}
                      </Typography>
                      <Box>
                        <Typography variant="body2" color="text.secondary">
                          <strong>Cliente:</strong> {getClientName(appointment.clientId)}
                        </Typography>
                        {getClientEmail(appointment.clientId) && (
                          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', overflowWrap: 'anywhere' }}>
                            {getClientEmail(appointment.clientId)}
                          </Typography>
                        )}
                      </Box>
                      <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 0.5 }}>
                        <Tooltip title={isPast ? 'Reserva pasada no editable' : 'Editar estado'} arrow>
                          <span>
                            <IconButton size="small" color="primary" onClick={() => openEditStatus(appointment)} disabled={updatingId === appointment._id || isPast}>
                              <EditIcon fontSize="small" />
                            </IconButton>
                          </span>
                        </Tooltip>
                        <Tooltip title={isPast ? 'Reserva pasada no editable' : 'Eliminar reserva'} arrow>
                          <span>
                            <IconButton size="small" color="error" onClick={() => setDeletingAppointment(appointment)} disabled={updatingId === appointment._id || isPast}>
                              <DeleteIcon fontSize="small" />
                            </IconButton>
                          </span>
                        </Tooltip>
                      </Box>
                    </Stack>
                  </Paper>
                )
              })
            )}
          </Box>
        ) : (
          <TableContainer
            component={Paper}
            elevation={0}
            sx={{ borderRadius: 1, border: '1px solid', borderColor: 'divider', overflow: 'hidden' }}
          >
            <Table size="small">
              <TableHead sx={{ bgcolor: 'rgba(47,107,95,0.08)' }}>
                <TableRow>
                  <TableCell>
                    <TableSortLabel active={sortKey === 'date'} direction={sortDirection} onClick={() => handleSort('date')}>
                      Fecha
                    </TableSortLabel>
                  </TableCell>
                  <TableCell>
                    <TableSortLabel active={sortKey === 'timeSlot'} direction={sortDirection} onClick={() => handleSort('timeSlot')}>
                      Hora
                    </TableSortLabel>
                  </TableCell>
                  <TableCell>
                    <TableSortLabel active={sortKey === 'barber'} direction={sortDirection} onClick={() => handleSort('barber')}>
                      Barbero
                    </TableSortLabel>
                  </TableCell>
                  <TableCell>Cliente</TableCell>
                  <TableCell>Estado</TableCell>
                  <TableCell align="right">Acciones</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={6} align="center" sx={{ py: 6 }}>
                      <CircularProgress size={26} />
                    </TableCell>
                  </TableRow>
                ) : filteredAndSorted.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} align="center" sx={{ py: 6 }}>
                      <Typography variant="body2" color="text.secondary">
                        No hay reservas para los filtros seleccionados.
                      </Typography>
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredAndSorted.map((appointment) => {
                    const isPast = isPastAppointment(appointment)
                    return (
                      <TableRow key={appointment._id} hover sx={{ '&:nth-of-type(odd)': { bgcolor: 'rgba(47,107,95,0.04)' } }}>
                        <TableCell>{dayjs(appointment.date).format('DD/MM/YYYY')}</TableCell>
                        <TableCell>{appointment.timeSlot}</TableCell>
                        <TableCell>{getBarberName(appointment.barberId)}</TableCell>
                        <TableCell>
                          <Box sx={{ minWidth: 0 }}>
                            <Typography variant="body2" sx={{ fontWeight: 700, color: 'text.primary', lineHeight: 1.25 }}>
                              {getClientName(appointment.clientId)}
                            </Typography>
                            {getClientEmail(appointment.clientId) && (
                              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', overflowWrap: 'anywhere', lineHeight: 1.25 }}>
                                {getClientEmail(appointment.clientId)}
                              </Typography>
                            )}
                          </Box>
                        </TableCell>
                        <TableCell>
                          <Chip label={statusLabel[appointment.status]} color={statusColor[appointment.status]} size="small" sx={{ fontWeight: 600 }} />
                        </TableCell>
                        <TableCell align="right">
                          <Stack direction="row" spacing={0.4} sx={{ justifyContent: 'flex-end' }}>
                            <Tooltip title={isPast ? 'Reserva pasada no editable' : 'Editar estado'} arrow>
                              <span>
                                <IconButton size="small" color="primary" onClick={() => openEditStatus(appointment)} disabled={updatingId === appointment._id || isPast}>
                                  <EditIcon fontSize="small" />
                                </IconButton>
                              </span>
                            </Tooltip>
                            <Tooltip title={isPast ? 'Reserva pasada no editable' : 'Eliminar reserva'} arrow>
                              <span>
                                <IconButton size="small" color="error" onClick={() => setDeletingAppointment(appointment)} disabled={updatingId === appointment._id || isPast}>
                                  <DeleteIcon fontSize="small" />
                                </IconButton>
                              </span>
                            </Tooltip>
                          </Stack>
                        </TableCell>
                      </TableRow>
                    )
                  })
                )}
              </TableBody>
            </Table>
          </TableContainer>
        )}

        <Snackbar
          open={!!toast}
          autoHideDuration={2500}
          onClose={() => setToast(null)}
          message={toast ?? ''}
        />

        <Dialog open={!!editingAppointment} onClose={() => setEditingAppointment(null)} fullWidth maxWidth="xs">
          <DialogTitle>Editar estado de reserva</DialogTitle>
          <DialogContent>
            <FormControl size="small" fullWidth sx={{ mt: 1 }}>
              <InputLabel>Estado</InputLabel>
              <Select
                label="Estado"
                value={statusDraft}
                onChange={(e) => setStatusDraft(e.target.value as AppointmentStatus)}
              >
                <MenuItem value="pending">Pendiente</MenuItem>
                <MenuItem value="confirmed">Confirmada</MenuItem>
                <MenuItem value="cancelled">Cancelada</MenuItem>
                <MenuItem value="completed">Completada</MenuItem>
              </Select>
            </FormControl>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setEditingAppointment(null)}>Cancelar</Button>
            <Button variant="contained" onClick={handleConfirmEditStatus} disabled={updatingId !== null}>
              Guardar
            </Button>
          </DialogActions>
        </Dialog>

        <Dialog open={!!deletingAppointment} onClose={() => setDeletingAppointment(null)} fullWidth maxWidth="xs">
          <DialogTitle>Eliminar reserva</DialogTitle>
          <DialogContent>
            <Typography variant="body2" color="text.secondary">
              Esta accion eliminara la reserva seleccionada de forma permanente.
            </Typography>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setDeletingAppointment(null)}>Cancelar</Button>
            <Button variant="contained" color="error" onClick={handleDeleteAppointment} disabled={updatingId !== null}>
              Eliminar
            </Button>
          </DialogActions>
        </Dialog>
      </Container>
    </Box>
  )
}
