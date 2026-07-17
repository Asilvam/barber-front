import dayjs, { type Dayjs } from 'dayjs'
import utc from 'dayjs/plugin/utc'
import timezone from 'dayjs/plugin/timezone'

dayjs.extend(utc)
dayjs.extend(timezone)

export const BUSINESS_TIME_ZONE = 'America/Santiago'

export function businessNow(): Dayjs {
  return dayjs().tz(BUSINESS_TIME_ZONE)
}

export function businessDate(date: string): Dayjs {
  return dayjs.tz(`${date}T00:00:00`, BUSINESS_TIME_ZONE)
}

export function businessAppointmentDateTime(date: string, time: string): Dayjs {
  return dayjs.tz(`${date}T${time}:00`, BUSINESS_TIME_ZONE)
}
