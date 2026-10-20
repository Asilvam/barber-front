import EntityStatusBadge from "../components/EntityStatusBadge";
import { useEffect, useRef, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  IconButton,
  Chip,
  CircularProgress,
  Container,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Tooltip,
  TextField,
  Typography,
} from "@mui/material";
import HistoryIcon from "@mui/icons-material/History";
import BlockIcon from "@mui/icons-material/Block";
import LockOpenIcon from "@mui/icons-material/LockOpen";
import { fetchClients, setBookingAccess, type Client } from "../api/clients";
import {
  fetchAdminAppointments,
  type AdminAppointment,
  type AppointmentStatus,
} from "../api/appointments";
import { appDialog } from "../utils/notifications";
import "../styles/AdminClients.css";
const bookingGroups: { title: string; statuses: AppointmentStatus[] }[] = [
  { title: "Agendadas", statuses: ["pending", "confirmed"] },
  { title: "Canceladas", statuses: ["cancelled"] },
  { title: "Completadas", statuses: ["completed"] },
];
const labels = {
  pending: "Pendiente de aprobación",
  confirmed: "Confirmada",
  cancelled: "Cancelada",
  completed: "Completada",
};
const errorMessage = (error: unknown) =>
  (error as { response?: { data?: { message?: string } } })?.response?.data
    ?.message ?? "No se pudo completar la operación. Intenta nuevamente.";
export default function AdminClients() {
  const [clients, setClients] = useState<Client[]>([]);
  const [appointments, setAppointments] = useState<AdminAppointment[]>([]);
  const [query, setQuery] = useState("");
  const historyTriggerRef = useRef<HTMLButtonElement | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => {
    let active = true;
    Promise.all([fetchClients(), fetchAdminAppointments()])
      .then(([users, bookings]) => {
        if (active) {
          setClients(users);
          setAppointments(bookings);
        }
      })
      .catch((e) => {
        if (active) setError(errorMessage(e));
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);
  const changeAccess = async (client: Client) => {
    const blocked = !client.isBookingBlocked;
    const result = await appDialog.fire({
      title: blocked ? "¿Bloquear cliente?" : "¿Desbloquear cliente?",
      text: blocked
        ? "No podrá crear nuevas reservas. Sus reservas vigentes se mantendrán."
        : "El cliente podrá volver a crear reservas.",
      icon: "warning",
      showCancelButton: true,
      cancelButtonText: "Volver",
      confirmButtonText: blocked ? "Bloquear" : "Desbloquear",
      ...(blocked
        ? {
            input: "textarea" as const,
            inputLabel: "Motivo interno (obligatorio)",
            inputAttributes: { maxlength: "500" },
            inputValidator: (value: string) =>
              !value.trim() ? "Escribe el motivo del bloqueo." : undefined,
          }
        : {}),
    });
    if (!result.isConfirmed) return;
    setBusy(true);
    try {
      const updated = await setBookingAccess(
        client._id,
        blocked,
        blocked ? String(result.value).trim() : "Desbloqueo por administración",
      );
      setClients((current) =>
        current.map((c) => (c._id === updated._id ? updated : c)),
      );
      setError("");
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  };
  const filteredClients = clients.filter((client) =>
    `${client.name} ${client.email}`
      .toLowerCase()
      .includes(query.toLowerCase().trim()),
  );
  const closeHistory = () => {
    const focused = document.activeElement;
    if (focused instanceof HTMLElement && focused.closest('[role="dialog"]'))
      focused.blur();
    setSelected(null);
  };
  const current = clients.find((c) => c._id === selected);
  const bookings = appointments.filter(
    (a) =>
      (typeof a.clientId === "string" ? a.clientId : a.clientId?._id) ===
      selected,
  );
  return (
    <Box className="admin-clients-bg">
      <Container className="admin-clients" maxWidth="xl">
        <Paper className="admin-clients-hero" elevation={0}>
          <Typography
            variant="h5"
            component="h1"
            sx={{ fontWeight: 800, color: "primary.dark" }}
          >
            Centro de Clientes
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
            Gestiona el acceso a nuevas reservas y consulta el historial del
            cliente.
          </Typography>
        </Paper>
        <Paper className="admin-clients-filters" elevation={0}>
          <TextField
            label="Buscar por nombre o correo"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            size="small"
            fullWidth
          />
        </Paper>
        {error && <Alert severity="error">{error}</Alert>}
        {loading ? (
          <CircularProgress aria-label="Cargando clientes" />
        ) : (
          <Box className="admin-clients-grid">
            <TableContainer
              component={Paper}
              variant="outlined"
              className="admin-clients-table-container"
            >
              <Table
                size="small"
                aria-label="Clientes"
                className="admin-clients-table"
              >
                <TableHead>
                  <TableRow>
                    <TableCell>Nombre</TableCell>
                    <TableCell>Correo</TableCell>
                    <TableCell>Fecha de ingreso</TableCell>
                    <TableCell>Estado</TableCell>
                    <TableCell align="right">Acciones</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {filteredClients.map((client) => (
                    <TableRow
                      key={client._id}
                      selected={selected === client._id}
                      hover
                    >
                      <TableCell sx={{ fontWeight: 700 }}>
                        {client.name}
                      </TableCell>
                      <TableCell>{client.email}</TableCell>
                      <TableCell sx={{ whiteSpace: "nowrap" }}>
                        <span className="admin-client-mobile-label">
                          Ingreso:{" "}
                        </span>
                        {client.createdAt &&
                        !Number.isNaN(Date.parse(client.createdAt))
                          ? new Date(client.createdAt).toLocaleDateString(
                              "es-CL",
                              { timeZone: "America/Santiago" },
                            )
                          : "Sin registro"}
                      </TableCell>
                      <TableCell>
                        <EntityStatusBadge
                          label={
                            client.isBookingBlocked ? "Bloqueado" : "Habilitado"
                          }
                          color={client.isBookingBlocked ? "error" : "success"}
                        />
                      </TableCell>
                      <TableCell align="right">
                        <Box className="admin-client-actions">
                          <Tooltip title="Ver historial y reservas">
                            <IconButton
                              size="small"
                              color="primary"
                              aria-label={`Ver historial y reservas de ${client.name}`}
                              aria-pressed={selected === client._id}
                              onClick={(event) => {
                                historyTriggerRef.current = event.currentTarget;
                                event.currentTarget.blur();
                                setSelected(client._id);
                              }}
                            >
                              <HistoryIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                          <Tooltip
                            title={
                              client.isBookingBlocked
                                ? "Desbloquear cliente"
                                : "Bloquear cliente"
                            }
                          >
                            <span>
                              <IconButton
                                size="small"
                                color={
                                  client.isBookingBlocked ? "success" : "error"
                                }
                                aria-label={`${client.isBookingBlocked ? "Desbloquear" : "Bloquear"} a ${client.name}`}
                                disabled={busy}
                                onClick={() => void changeAccess(client)}
                              >
                                {client.isBookingBlocked ? (
                                  <LockOpenIcon fontSize="small" />
                                ) : (
                                  <BlockIcon fontSize="small" />
                                )}
                              </IconButton>
                            </span>
                          </Tooltip>
                        </Box>
                      </TableCell>
                    </TableRow>
                  ))}
                  {!filteredClients.length && (
                    <TableRow>
                      <TableCell colSpan={5} align="center">
                        No hay clientes que coincidan.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </TableContainer>
            <Dialog
              open={!!current}
              onClose={closeHistory}
              fullWidth
              maxWidth="sm"
              scroll="paper"
              aria-labelledby="client-history-title"
              slotProps={{
                paper: { className: "admin-client-history" },
                transition: {
                  onExited: () => {
                    if (historyTriggerRef.current?.isConnected)
                      historyTriggerRef.current.focus();
                  },
                },
              }}
            >
              <DialogTitle id="client-history-title">
                Historial de {current?.name}
              </DialogTitle>
              <DialogContent dividers className="admin-client-history-content">
                {current && (
                  <>
                    <Typography component="h2" sx={{ fontWeight: 700 }}>
                      Bloqueos y desbloqueos
                    </Typography>
                    {!current.bookingAccessHistory?.length && (
                      <Typography>Sin cambios de acceso.</Typography>
                    )}
                    {[...(current.bookingAccessHistory ?? [])]
                      .reverse()
                      .map((event, i) => (
                        <Box key={i} className="admin-client-event">
                          <Typography sx={{ fontWeight: 700 }}>
                            {event.blocked ? "Bloqueado" : "Desbloqueado"}
                          </Typography>
                          <Typography>{event.reason}</Typography>
                          <Typography variant="caption">
                            {event.actorName} ·{" "}
                            {new Date(event.at).toLocaleString("es-CL", {
                              timeZone: "America/Santiago",
                            })}
                          </Typography>
                        </Box>
                      ))}
                    <Typography component="h2" sx={{ fontWeight: 700 }}>
                      Reservas
                    </Typography>
                    {!bookings.length && (
                      <Typography>Sin reservas registradas.</Typography>
                    )}
                    {bookings.length > 0 &&
                      bookingGroups.map((group) => {
                        const items = bookings.filter((booking) =>
                          group.statuses.includes(booking.status),
                        );
                        return (
                          <Box
                            key={group.title}
                            className="admin-client-booking-group"
                          >
                            <Typography
                              component="h3"
                              variant="subtitle2"
                              sx={{ fontWeight: 700 }}
                            >
                              {group.title} ({items.length})
                            </Typography>
                            {!items.length && (
                              <Typography
                                variant="body2"
                                color="text.secondary"
                              >
                                Sin reservas en este estado.
                              </Typography>
                            )}
                            {items.map((appointment) => (
                              <Box
                                key={appointment._id}
                                className="admin-client-event"
                              >
                                <Box className="admin-client-booking-heading">
                                  <Typography>
                                    {appointment.date
                                      .split("-")
                                      .reverse()
                                      .join("/")}{" "}
                                    · {appointment.timeSlot}
                                  </Typography>
                                  <Chip
                                    size="small"
                                    label={labels[appointment.status]}
                                    color={
                                      appointment.status === "pending"
                                        ? "warning"
                                        : appointment.status === "confirmed"
                                          ? "success"
                                          : appointment.status === "cancelled"
                                            ? "error"
                                            : "default"
                                    }
                                  />
                                </Box>
                                <Typography
                                  variant="body2"
                                  color="text.secondary"
                                >
                                  {typeof appointment.barberId === "string"
                                    ? "Barbero"
                                    : appointment.barberId?.name}
                                </Typography>
                              </Box>
                            ))}
                          </Box>
                        );
                      })}
                  </>
                )}
              </DialogContent>
              <DialogActions>
                <Button onClick={closeHistory}>Cerrar</Button>
              </DialogActions>
            </Dialog>
          </Box>
        )}
      </Container>
    </Box>
  );
}
