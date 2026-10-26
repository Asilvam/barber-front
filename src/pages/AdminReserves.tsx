import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import dayjs from 'dayjs'
import { appDialog as Swal } from '../utils/notifications'
import Box from '@mui/material/Box'
import Container from '@mui/material/Container'
import Typography from '@mui/material/Typography'
import Paper from '@mui/material/Paper'
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
import ArchiveOutlinedIcon from '@mui/icons-material/ArchiveOutlined'
import ButtonGroup from '@mui/material/ButtonGroup'
import type { Barber } from '../api/barber'
import {
  archiveAppointment,
  fetchAdminAppointments,
  updateAppointmentStatus,
  type AdminAppointment,
  type AppointmentStatus,
} from '../api/appointments'
import { businessAppointmentDateTime, businessNow } from '../utils/businessTime'
import { showNotice } from '../utils/notifications'

type SortKey = 'date' | 'timeSlot' | 'barber'
type SortDirection = 'asc' | 'desc'

const statusLabel: Record<AppointmentStatus, string> = {
  pending: 'Pendiente',
  confirmed: 'Confirmada',
  cancelled: 'Cancelada',
  completed: 'Completada',
  no_show: 'No asistió',
}

const statusColor: Record<AppointmentStatus, 'warning' | 'success' | 'default' | 'error'> = {
  pending: 'warning',
  confirmed: 'success',
  cancelled: 'error',
  completed: 'default',
  no_show: 'warning',
}

function getAppointmentStatusLabel(appointment: AdminAppointment): string {
  if (appointment.status !== 'cancelled') return statusLabel[appointment.status]
  if (appointment.cancelledBy === 'user') return 'Cancelada por usuario'
  if (appointment.cancelledBy === 'admin') return 'Cancelada por administrador'
  return statusLabel.cancelled
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

function allowedStatusChanges(appointment: AdminAppointment, now: ReturnType<typeof businessNow>): AppointmentStatus[] {
  if (appointment.status === 'pending') return ['confirmed', 'cancelled']
  if (appointment.status === 'confirmed') {
    return businessAppointmentDateTime(appointment.date, appointment.timeSlot).isAfter(now)
      ? ['cancelled']
      : ['completed', 'cancelled', 'no_show']
  }
  return []
}

export default function AdminReserves() {
  const navigate = useNavigate()
  const theme = useTheme()
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'))
  const [appointments, setAppointments] = useState<AdminAppointment[]>([])
  const [currentTime, setCurrentTime] = useState(businessNow)
  useEffect(() => {
    const timer = window.setInterval(() => setCurrentTime(businessNow()), 30_000)
    return () => window.clearInterval(timer)
  }, [])

  const [loading, setLoading] = useState(true)
  const [agendaView, setAgendaView] = useState<'today' | 'all' | 'closing'>('today')
  const [statusFilter, setStatusFilter] = useState<'all' | AppointmentStatus>('all')
  const [barberFilter, setBarberFilter] = useState<'all' | string>('all')
  const [clientQuery, setClientQuery] = useState('')
  const [sortKey, setSortKey] = useState<SortKey>('date')
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc')
  const [updatingId, setUpdatingId] = useState<string | null>(null)
  const [editingAppointment, setEditingAppointment] = useState<AdminAppointment | null>(null)
  const [statusDraft, setStatusDraft] = useState<AppointmentStatus>('pending')

  useEffect(() => {
    let active = true
    fetchAdminAppointments()
      .then((data) => {
        if (!active) return
        setAppointments(data)
      })
      .catch((err) => {
        if (!active) return
        void showNotice(
          err instanceof Error ? err.message : 'No se pudieron cargar las reservas',
          'error',
          'No se pudieron cargar las reservas',
        )
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

  const closingCount = useMemo(() => appointments.filter((appointment) => appointment.status === 'confirmed' && !businessAppointmentDateTime(appointment.date, appointment.timeSlot).isAfter(currentTime)).length, [appointments, currentTime])
  const agendaAppointments = useMemo(() => appointments.filter((appointment) => {
    if (agendaView === 'today') return appointment.status === 'pending' || appointment.date === currentTime.format('YYYY-MM-DD')
    if (agendaView === 'closing') return appointment.status === 'confirmed' && !businessAppointmentDateTime(appointment.date, appointment.timeSlot).isAfter(currentTime)
    return true
  }), [appointments, agendaView, currentTime])

  const filteredAndSorted = useMemo(() => {
    const normalizedQuery = clientQuery.trim().toLowerCase()

    const filtered = agendaAppointments.filter((appointment) => {
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
      const pendingPriority = Number(b.status === 'pending') - Number(a.status === 'pending')
      if (pendingPriority !== 0) return pendingPriority
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
  }, [agendaAppointments, statusFilter, barberFilter, clientQuery, sortKey, sortDirection])

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
    if (!current || current.status === status) return
    if (!allowedStatusChanges(current, businessNow()).includes(status)) {
      void showNotice('Ese cambio no está permitido. Solo puedes completar o marcar No asistió desde el inicio de una reserva confirmada.', 'warning')
      return
    }

    if (status === 'cancelled') {
      const confirmation = await Swal.fire({
        title: '¿Cancelar reserva?',
        text: 'Se liberará el horario y se enviará un correo al cliente. La cancelación es definitiva.',
        icon: 'warning', showCancelButton: true, confirmButtonText: 'Sí, cancelar reserva', cancelButtonText: 'Volver',
      })
      if (!confirmation.isConfirmed) return
    }

    if (status === 'no_show') {
      const confirmation = await Swal.fire({ title: '¿Marcar como No asistió?', text: 'Quedará registrado en el historial del cliente. Este estado es definitivo.', icon: 'warning', showCancelButton: true, confirmButtonText: 'Sí, no asistió', cancelButtonText: 'Volver' })
      if (!confirmation.isConfirmed) return
    }

    setUpdatingId(appointmentId)
    try {
      const updated = await updateAppointmentStatus(appointmentId, status)
      setAppointments((prev) => prev.map((item) => (item._id === appointmentId ? updated : item)))
      void showNotice('Estado actualizado correctamente.', 'success')
    } catch (err) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message
      void showNotice(msg ?? 'No se pudo actualizar el estado.', 'error')
    } finally {
      setUpdatingId(null)
    }
  }

  const openEditStatus = (appointment: AdminAppointment) => {
    if (['cancelled', 'completed', 'no_show'].includes(appointment.status)) {
      void showNotice('Una reserva cancelada, completada o marcada como No asistió es definitiva y no puede modificarse.', 'warning')
      return
    }
    setEditingAppointment(appointment)
    setStatusDraft(appointment.status)
  }

  const handleConfirmEditStatus = async () => {
    if (!editingAppointment) return

    const appointmentId = editingAppointment._id
    setEditingAppointment(null)
    await handleStatusChange(appointmentId, statusDraft)
  }

  const handleArchiveAppointment = async (appointment: AdminAppointment) => {
    if (!['cancelled', 'completed', 'no_show'].includes(appointment.status)) {
      void showNotice('Solo puedes archivar reservas canceladas, completadas o marcadas como No asistió.', 'warning')
      return
    }

    const confirmation = await Swal.fire({
      title: '¿Archivar reserva?',
      text: 'Se quitará del listado de reservas y se conservará en el historial del cliente.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Sí, archivar',
      cancelButtonText: 'Cancelar',
      background: '#ffffff',
      color: '#1b191d',
    })
    if (!confirmation.isConfirmed) return

    const appointmentId = appointment._id
    setUpdatingId(appointmentId)
    try {
      await archiveAppointment(appointmentId)
      setAppointments((prev) => prev.filter((item) => item._id !== appointmentId))
      void showNotice('Reserva archivada. Se conservó en el historial del cliente.', 'success')
    } catch (err) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message
      void showNotice(msg ?? 'No se pudo archivar la reserva.', 'error')
    } finally {
      setUpdatingId(null)
    }
  }

  const statusTotals = useMemo(() => {
    return agendaAppointments.reduce(
      (acc, item) => {
        acc[item.status] += 1
        return acc
      },
      {
        pending: 0,
        confirmed: 0,
        cancelled: 0,
        completed: 0,
        no_show: 0,
      } as Record<AppointmentStatus, number>,
    )
  }, [agendaAppointments])

  return (
    <Box className="admin-bg">
      <Container
        maxWidth="xl"
        sx={{
          py: { xs: 2, sm: 4 },
          px: { xs: 2, sm: 4 },
          maxWidth: 'var(--shell-max-width) !important',
        }}
      >
        <Paper
          elevation={0}
          sx={{
            p: { xs: 2, sm: 3, lg: 3.5 },
            mb: 2,
            borderRadius: 1,
            border: '1px solid',
            borderColor: 'divider',
            background:
              'linear-gradient(135deg, rgba(201, 20, 112,0.12) 0%, rgba(245, 243, 244,0.85) 55%, rgba(255, 255, 255,1) 100%)',
          }}
        >
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: {
                xs: 'minmax(0, 1fr) minmax(122px, 0.72fr)',
                sm: 'minmax(0, 1fr) auto',
              },
              alignItems: { xs: 'start', sm: 'center' },
              gap: { xs: 1.5, sm: 3 },
            }}
          >
            <Box sx={{ minWidth: 0 }}>
              <Typography variant="h5" sx={{ fontWeight: 800, color: 'primary.dark' }}>
                Centro de Reservas
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                Gestiona citas ordenadas por proximidad y controla su estado en tiempo real.
              </Typography>
            </Box>
            <Box
              sx={{
                display: 'grid',
                gridTemplateColumns: { xs: '1fr', sm: 'auto auto' },
                alignItems: 'center',
                justifyContent: 'end',
                gap: 1,
              }}
            >
              <Chip
                icon={<EventNoteIcon />}
                label={`${agendaAppointments.length} ${agendaAppointments.length === 1 ? 'reserva' : 'reservas'}`}
                color="primary"
                variant="filled"
                sx={{ fontWeight: 700, borderRadius: 1 }}
              />
              <Button
                variant="outlined"
                startIcon={<ArrowBackIcon />}
                onClick={() => navigate('/admin/barbers')}
                sx={{
                  borderRadius: 1,
                  textTransform: 'none',
                  fontWeight: 600,
                  whiteSpace: 'nowrap',
                  width: '100%',
                }}
              >
                Volver
              </Button>
            </Box>
          </Box>
        </Paper>

        <ButtonGroup aria-label="Vista de agenda" size="small" sx={{ mb: 2, flexWrap: 'wrap' }}>
          <Button variant={agendaView === 'today' ? 'contained' : 'outlined'} onClick={() => setAgendaView('today')}>Hoy y pendientes</Button>
          <Button variant={agendaView === 'all' ? 'contained' : 'outlined'} onClick={() => setAgendaView('all')}>Todas</Button>
          <Button variant={agendaView === 'closing' ? 'contained' : 'outlined'} onClick={() => setAgendaView('closing')}>Por cerrar ({closingCount})</Button>
        </ButtonGroup>

        <Box sx={{ mb: 2.2 }}>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1}>
            <Chip icon={<PendingActionsIcon />} label={`Pendientes: ${statusTotals.pending}`} color="warning" />
            <Chip icon={<CheckCircleIcon />} label={`Confirmadas: ${statusTotals.confirmed}`} color="success" />
            <Chip icon={<CancelIcon />} label={`Canceladas: ${statusTotals.cancelled}`} color="error" />
            <Chip icon={<TaskAltIcon />} label={`Completadas: ${statusTotals.completed}`} color="default" />
            <Chip label={`No asistieron: ${statusTotals.no_show}`} color="warning" />
          </Stack>
        </Box>

        <Paper
          elevation={0}
          sx={{
            border: '1px solid',
            borderColor: 'divider',
            borderRadius: 1,
            p: 2,
            mb: 2,
            bgcolor: 'rgba(255, 255, 255,0.86)',
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
                <MenuItem value="no_show">No asistió</MenuItem>
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
                const isFinal = ['cancelled', 'completed', 'no_show'].includes(appointment.status)
                const editDisabled = updatingId === appointment._id || allowedStatusChanges(appointment, currentTime).length === 0
                const editTooltip = isFinal ? 'Una reserva cancelada, completada o marcada como No asistió no puede cambiar de estado' : 'Editar estado'
                return (
                  <Paper key={appointment._id} elevation={0} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 1, p: 1.5 }}>
                    <Stack spacing={0.8}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 1 }}>
                        <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                          {dayjs(appointment.date).format('DD/MM/YYYY')} · {appointment.timeSlot}
                        </Typography>
                        <Chip label={getAppointmentStatusLabel(appointment)} color={statusColor[appointment.status]} size="small" sx={{ fontWeight: 600 }} />
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
                        <Tooltip title={editTooltip} arrow>
                          <span>
                            <IconButton size="small" color="primary" onClick={() => openEditStatus(appointment)} disabled={editDisabled}>
                              <EditIcon fontSize="small" />
                            </IconButton>
                          </span>
                        </Tooltip>
                        <Tooltip title={isFinal ? 'Archivar reserva' : 'Primero resuelve el estado de la reserva'} arrow>
                          <span>
                            <IconButton size="small" color="primary" aria-label="Archivar reserva" onClick={() => void handleArchiveAppointment(appointment)} disabled={updatingId === appointment._id || !isFinal}>
                              <ArchiveOutlinedIcon fontSize="small" />
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
              <TableHead sx={{ bgcolor: 'rgba(201, 20, 112,0.08)' }}>
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
                        const isFinal = ['cancelled', 'completed', 'no_show'].includes(appointment.status)
                    const statusDisabled = updatingId === appointment._id || allowedStatusChanges(appointment, currentTime).length === 0
                    return (
                      <TableRow key={appointment._id} hover sx={{ '&:nth-of-type(odd)': { bgcolor: 'rgba(201, 20, 112,0.04)' } }}>
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
                          {isFinal ? (
                            <Chip
                              label={getAppointmentStatusLabel(appointment)}
                              color={statusColor[appointment.status]}
                              size="small"
                              icon={appointment.status === 'completed' ? <TaskAltIcon /> : undefined}
                              sx={{
                                fontWeight: 600,
                                ...(appointment.status === 'completed' ? {
                                  width: 138,
                                  height: 36,
                                  borderRadius: 1,
                                  fontSize: 13,
                                  border: '1px solid var(--border)',
                                  bgcolor: 'var(--status-completed-bg)',
                                  color: 'var(--status-completed)',
                                  '& .MuiChip-icon': { color: 'inherit', fontSize: 18 },
                                } : {}),
                              }}
                            />
                          ) : (
                            <FormControl size="small" sx={{ minWidth: 138 }}>
                              <Select
                                value={appointment.status}
                                onChange={(event) => {
                                  void handleStatusChange(
                                    appointment._id,
                                    event.target.value as AppointmentStatus,
                                  )
                                }}
                                disabled={statusDisabled}
                                inputProps={{ 'aria-label': 'Cambiar estado de reserva' }}
                                sx={{ fontSize: 13, fontWeight: 600 }}
                              >
                                {[appointment.status, ...allowedStatusChanges(appointment, currentTime)].map((status) => (
                                  <MenuItem key={status} value={status}>{statusLabel[status]}</MenuItem>
                                ))}
                              </Select>
                            </FormControl>
                          )}
                        </TableCell>
                        <TableCell align="right">
                          <Stack direction="row" spacing={0.4} sx={{ justifyContent: 'flex-end' }}>
                            <Tooltip title={isFinal ? 'Archivar reserva' : 'Primero resuelve el estado de la reserva'} arrow>
                              <span>
                                <IconButton size="small" color="primary" aria-label="Archivar reserva" onClick={() => void handleArchiveAppointment(appointment)} disabled={updatingId === appointment._id || !isFinal}>
                                  <ArchiveOutlinedIcon fontSize="small" />
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
                {editingAppointment && [editingAppointment.status, ...allowedStatusChanges(editingAppointment, currentTime)].map((status) => (
                  <MenuItem key={status} value={status}>{statusLabel[status]}</MenuItem>
                ))}
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

      </Container>
    </Box>
  )
}
