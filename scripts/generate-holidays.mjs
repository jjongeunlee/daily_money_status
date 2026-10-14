import Holidays from 'date-holidays'
import { writeFile } from 'node:fs/promises'
// Source: date-holidays KR (ISC / CC-BY-3.0). Only calendar data ships to browsers.
const holidays = new Holidays('KR', { languages: 'ko', types: ['public'], timezone: 'Asia/Seoul' })
const dates = {}
for (let year = 2020; year <= 2050; year++) {
  for (const holiday of holidays.getHolidays(year)) {
    // date-holidays 3.37.0 anchors Seollal's three-day span one day late.
    // Shift only this rule; substitute-holiday rules already use the correct dates.
    const shift = holiday.rule === 'korean 01-0-01 P3D' ? -86400000 : 0
    for (let time = +holiday.start + shift; time < +holiday.end + shift; time += 86400000) {
      const date = new Date(time + 9 * 3600000).toISOString().slice(0, 10)
      dates[date] = [...new Set([...(dates[date] || []), holiday.name])]
    }
  }
}
// Announced exceptional national public holidays, absent from recurring rules.
for (const [day, name] of Object.entries({
  '2020-04-15': '국회의원 선거일', '2020-08-17': '임시공휴일',
  '2022-03-09': '대통령 선거일', '2022-06-01': '지방선거일',
  '2023-10-02': '임시공휴일', '2024-04-10': '국회의원 선거일',
  '2024-10-01': '임시공휴일', '2025-01-27': '임시공휴일',
  '2025-06-03': '대통령 선거일', '2026-06-03': '지방선거일',
})) dates[day] = [...new Set([...(dates[day] || []), name])]
await writeFile('src/domain/holidays.json', JSON.stringify({ from: 2020, to: 2050, dates }) + '\n')
