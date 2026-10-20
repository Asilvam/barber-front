import Chip from '@mui/material/Chip'
import CheckCircleOutlinedIcon from '@mui/icons-material/CheckCircleOutlined'
import BlockIcon from '@mui/icons-material/Block'
import PauseCircleOutlinedIcon from '@mui/icons-material/PauseCircleOutlined'

type EntityStatusBadgeProps = {
  label: string
  color: 'success' | 'error' | 'default'
}

export default function EntityStatusBadge({ label, color }: EntityStatusBadgeProps) {
  const icon = color === 'success' ? <CheckCircleOutlinedIcon /> : color === 'error' ? <BlockIcon /> : <PauseCircleOutlinedIcon />
  return <Chip label={label} color={color} icon={icon} size="small" sx={{
    width: { xs: 'auto', sm: 138 },
    maxWidth: '100%',
    height: { xs: 28, sm: 36 },
    borderRadius: 1,
    fontSize: { xs: 11, sm: 13 },
    fontWeight: 600,
    border: '1px solid',
    borderColor: 'divider',
    '& .MuiChip-icon': { color: 'inherit', fontSize: 18 },
  }} />
}
