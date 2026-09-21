#!/usr/bin/env node
// Compacts a .srt or .vtt subtitle file into one line per subtitle and lists
// the stretches without dialogue, which are the candidate cut points.
//
//   node compact-subs.mjs <subtitles.srt|.vtt> [--out <file>] [--gap <seconds>]
//
// Start times are rounded down and end times rounded UP to the whole second,
// so the end time of a line can be used as a cut timestamp as it is.
// Silences of --gap seconds or more get their own line in the transcript;
// shorter ones (2 s or more) are noted at the end of the line, as "(+4 s)".

import { readFileSync, writeFileSync } from 'node:fs'

const JUNK = [
  /opensubtitles/i,
  /subtitles?\s+(by|from|downloaded)/i,
  /subt[ií]tulos?\s+(por|de|descargados)/i,
  /(synced|sync(hronized)?|corrected|corrections|ripped|encoded|translated|traducido|traducci[oó]n|sincronizado)\s+(and\s+\w+\s+)?(by|por)\b/i,
  /\b(www\.|https?:\/\/)\S+/i,
  /\b\S+\.(com|org|net|tv|io)\b/i,
  /addic7ed|subscene|podnapisi|yify|yts\b|rarbg/i,
  /advertise your product|support us and become vip|rate this subtitle/i,
]

function fail(message) {
  console.error(`error: ${message}`)
  process.exit(1)
}

function parseArgs(argv) {
  const args = { file: null, out: null, gap: 6 }
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--out') args.out = argv[++i]
    else if (argv[i] === '--gap') args.gap = Number(argv[++i])
    else if (!args.file) args.file = argv[i]
  }
  if (!args.file) fail('usage: compact-subs.mjs <subtitles.srt|.vtt> [--out <file>] [--gap <seconds>]')
  if (!Number.isFinite(args.gap) || args.gap <= 0) fail('--gap needs a positive number of seconds')
  return args
}

function readText(path) {
  let buffer
  try {
    buffer = readFileSync(path)
  } catch {
    fail(`cannot read ${path}`)
  }
  if (buffer.length === 0) fail('the file is empty')
  if (buffer[0] === 0xff && buffer[1] === 0xfe) return buffer.toString('utf16le')
  let text = buffer.toString('utf8')
  // Replacement characters mean it was not UTF-8: old subtitles are often Latin-1.
  if (text.includes('\uFFFD')) text = buffer.toString('latin1')
  return text.replace(/^\uFEFF/, '')
}

// "01:02:03,456", "01:02:03.456" or "02:03.456" (VTT may omit the hours)
function toMs(stamp) {
  const match = stamp.match(/^(?:(\d+):)?(\d{1,2}):(\d{2})[.,](\d{1,3})$/)
  if (!match) return null
  const [, h = '0', m, s, ms] = match
  return ((Number(h) * 60 + Number(m)) * 60 + Number(s)) * 1000 + Number(ms.padEnd(3, '0'))
}

function clock(totalSeconds) {
  const h = Math.floor(totalSeconds / 3600)
  const m = Math.floor((totalSeconds % 3600) / 60)
  const s = totalSeconds % 60
  return [h, m, s].map((n) => String(n).padStart(2, '0')).join(':')
}

function duration(seconds) {
  if (seconds < 60) return `${seconds} s`
  return `${Math.floor(seconds / 60)} min ${String(seconds % 60).padStart(2, '0')} s`
}

function cleanText(lines) {
  return lines
    .join(' ')
    .replace(/<[^>]+>/g, '')
    .replace(/\{\\[^}]*\}/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}

function parse(text) {
  if (/^\s*\[Script Info\]/i.test(text)) {
    fail('this is an .ass/.ssa file. Convert it to .srt first; only .srt and .vtt are supported')
  }
  const timing = /^\s*(\S+)\s+-->\s+(\S+)/
  const cues = []
  for (const block of text.replace(/\r\n?/g, '\n').split(/\n{2,}/)) {
    const lines = block.split('\n')
    const at = lines.findIndex((line) => timing.test(line))
    if (at === -1) continue
    const [, from, to] = lines[at].match(timing)
    const start = toMs(from)
    const end = toMs(to)
    if (start === null || end === null) continue
    const body = cleanText(lines.slice(at + 1))
    if (body) cues.push({ start, end, text: body })
  }
  return cues.sort((a, b) => a.start - b.start)
}

const args = parseArgs(process.argv.slice(2))
const parsed = parse(readText(args.file))
if (parsed.length === 0) fail('no subtitles found. Is this really a .srt or .vtt file?')

const junk = parsed.filter((cue) => JUNK.some((pattern) => pattern.test(cue.text)))
const cues = parsed.filter((cue) => !junk.includes(cue))
if (cues.length === 0) fail('every subtitle looked like junk; nothing left to read')

const rows = cues.map((cue) => ({
  start: Math.floor(cue.start / 1000),
  end: Math.ceil(cue.end / 1000),
  text: cue.text,
}))

const gaps = []
for (let i = 1; i < rows.length; i++) {
  const length = rows[i].start - rows[i - 1].end
  if (length >= args.gap) gaps.push({ from: rows[i - 1].end, to: rows[i].start, length })
}

const out = []
out.push('# SUMMARY')
out.push(`subtitles: ${rows.length} (${junk.length} discarded as junk)`)
out.push(`first line starts: ${clock(rows[0].start)}`)
out.push(`last line ends:    ${clock(rows.at(-1).end)}`)
out.push(`gaps without dialogue of ${args.gap} s or more: ${gaps.length}`)
const garbled = rows.filter((row) => /\uFFFD|ï¿½/.test(row.text))
if (garbled.length > 0) {
  out.push(`lines with broken characters: ${garbled.length} (first at ${clock(garbled[0].start)})`)
}
if (junk.length > 0) {
  out.push('')
  out.push('# DISCARDED AS JUNK')
  for (const cue of junk) out.push(`${clock(Math.floor(cue.start / 1000))} ${cue.text}`)
}
out.push('')
out.push('# LONGEST GAPS WITHOUT DIALOGUE')
for (const gap of [...gaps].sort((a, b) => b.length - a.length).slice(0, 40)) {
  out.push(`${clock(gap.from)} -> ${clock(gap.to)}  (${duration(gap.length)})`)
}
out.push('')
out.push('# TRANSCRIPT')
rows.forEach((row, i) => {
  if (i > 0) {
    const length = row.start - rows[i - 1].end
    if (length >= args.gap) out.push(`        ······ ${duration(length)} without dialogue ······`)
  }
  const next = rows[i + 1]
  const pause = next ? next.start - row.end : 0
  const note = pause >= 2 && pause < args.gap ? `  (+${pause} s)` : ''
  out.push(`${clock(row.start)}–${clock(row.end)} ${row.text}${note}`)
})

const result = out.join('\n') + '\n'
if (args.out) {
  writeFileSync(args.out, result)
  console.log(`${out.length} lines written to ${args.out}`)
} else {
  process.stdout.write(result)
}
