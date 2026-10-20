import { useEffect, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Container,
  Paper,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { fetchClients, setBookingAccess, type Client } from "../api/clients";
import {
  fetchAdminAppointments,
  type AdminAppointment,
} from "../api/appointments";
import { appDialog } from "../utils/notifications";
import "../styles/AdminClients.css";
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
  const current = clients.find((c) => c._id === selected);
  const bookings = appointments.filter(
    (a) =>
      (typeof a.clientId === "string" ? a.clientId : a.clientId?._id) ===
      selected,
  );
  return (
    <Container className="admin-clients" maxWidth="lg">
      <Typography variant="h4" component="h1">
        Clientes
      </Typography>
      <Typography color="text.secondary">
        Gestiona el acceso a nuevas reservas y consulta el historial del
        cliente.
      </Typography>
      <TextField
        label="Buscar por nombre o correo"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        fullWidth
      />
      {error && <Alert severity="error">{error}</Alert>}
      {loading ? (
        <CircularProgress aria-label="Cargando clientes" />
      ) : (
        <Box className="admin-clients-grid">
          <Stack spacing={1.25} className="admin-client-list">
            {clients
              .filter((c) =>
                `${c.name} ${c.email}`
                  .toLowerCase()
                  .includes(query.toLowerCase().trim()),
              )
              .map((c) => (
                <Paper
                  className={`admin-client-card admin-client-list-card${selected === c._id ? " admin-client-selected" : ""}`}
                  variant="outlined"
                  key={c._id}
                >
                  <Box className="admin-client-identity">
                    <Typography sx={{ fontWeight: 700 }}>{c.name}</Typography>
                    <Typography variant="body2" color="text.secondary">
                      {c.email}
                    </Typography>
                  </Box>
                  <Chip
                    size="small"
                    label={
                      c.isBookingBlocked
                        ? "Bloqueado para reservas"
                        : "Habilitado"
                    }
                    color={c.isBookingBlocked ? "error" : "success"}
                  />
                  <Box className="admin-client-actions">
                    <Button
                      size="small"
                      aria-pressed={selected === c._id}
                      onClick={() => setSelected(c._id)}
                    >
                      Ver historial
                    </Button>
                    <Button
                      variant="outlined"
                      size="small"
                      disabled={busy}
                      onClick={() => void changeAccess(c)}
                    >
                      {c.isBookingBlocked ? "Desbloquear" : "Bloquear"}
                    </Button>
                  </Box>
                </Paper>
              ))}
            {!clients.some((c) =>
              `${c.name} ${c.email}`
                .toLowerCase()
                .includes(query.toLowerCase().trim()),
            ) && <Typography>No hay clientes que coincidan.</Typography>}
          </Stack>
          {!current && (
            <Paper
              className="admin-client-card admin-client-empty"
              variant="outlined"
            >
              <Typography variant="h6">Historial del cliente</Typography>
              <Typography color="text.secondary">
                Selecciona un cliente para consultar su historial.
              </Typography>
            </Paper>
          )}
          {current && (
            <Paper
              className="admin-client-card admin-client-history"
              variant="outlined"
              role="region"
              aria-label={`Historial de ${current.name}`}
            >
              <Typography variant="h6">Historial de {current.name}</Typography>
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
              {bookings.map((a) => (
                <Box key={a._id} className="admin-client-event">
                  <Typography>
                    {a.date.split("-").reverse().join("/")} · {a.timeSlot}
                  </Typography>
                  <Typography>
                    {typeof a.barberId === "string"
                      ? "Barbero"
                      : a.barberId?.name}{" "}
                    · {labels[a.status]}
                  </Typography>
                </Box>
              ))}
            </Paper>
          )}
        </Box>
      )}
    </Container>
  );
}
