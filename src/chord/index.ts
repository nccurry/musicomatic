import { ModeKeyNote } from "../mode"
import { interval, IntervalData, IntervalDistance, ShortIntervalName } from "../interval"
import { getEvenArrayElements, getEvenNumbers, normalizeValue, removeDuplicates } from "../utils"

// Types

export const diatonicChordType = ['maj', 'min', 'dim']
export type DiatonicChordType = typeof diatonicChordType[number]

export const chordType = [...diatonicChordType, 'dom', 'sus2', 'sus4', 'aug', 'dimsus2', 'dimsus4', 'augsus2', 'augsus4']
export type ChordType = typeof chordType[number]

export const chordAdditions = ['add2', 'add4', 'add6', 'add9', 'add11', 'add13']
export type ChordAddition = typeof chordAdditions[number]

export const chordAlteration = ['b2', '#2', 'b3', '#3', 'b4', '#4', 'b5', '#5', 'b6', '#6', 'b7', '#7', 'b9', '#9', 'b11', '#11', 'b13']
export type ChordAlteration = typeof chordAlteration[number]

export const chordExtensions = [5, 7, 9, 11, 13] as const
export type ChordExtension = typeof chordExtensions[number]

export const chordDegreeNumbers = [1, 2, 3, 4, 5, 6, 7, 9, 11, 13]
export type ChordDegreeNumber = typeof chordDegreeNumbers[number]

// https://en.wikipedia.org/wiki/Roman_numeral_analysis#Modes
// \u1d47 -> superscript b
// \u2070 -> superscript 0
// \u2075 -> superscript 5
export const chordNumerals = [
  'I', 'i', 'i\u2070',
  'II', '\u1d47II', 'ii', 'ii\u2070',
  '\u1d47III', 'iii', '\u1d47iii', 'iii\u2070',
  'IV', 'iv', '#iv\u2070',
  'V', '\u1d47V', 'v', 'v\u2070',
  '\u1d47VI', 'vi', 'vi\u2070',
  '\u1d47VII', 'vii', '\u1d47vii', 'vii\u2070'
] as const
export type ChordNumeral = typeof chordNumerals[number]

export interface Chord {
  root: ModeKeyNote
  type: ChordType
  extension?: ChordExtension
  additions?: ChordAddition[]
  alterations?: ChordAlteration[]
  slash?: ModeKeyNote
}

const chordDefaults: Required<Chord> = {
  root: 'C',
  type: 'maj',
  extension: 5,
  additions: [],
  alterations: [],
  slash: 'C'
}

// Data

// Tone intervals in chord bases
const chordTypeIntervals: { [key in ChordType]: IntervalDistance[] } = {
  // 1, 3, 5, 7, 9, 11, 13
  maj: [0, 2, 4, 5, 7, 9, 11],
  // b3, b7
  min: [0, 2, 3, 5, 7, 9, 10],
  // b3, b5
  dim: [0, 2, 3, 5, 6, 9, 11],
  // b7
  dom: [0, 2, 4, 5, 7, 9, 10],
  // #5
  aug: [0, 2, 4, 5, 8, 9, 11],
  // 3 -> 2
  sus2: [0, 2, 2, 5, 7, 9, 11],
  // 3 -> 4
  sus4: [0, 2, 5, 5, 7, 9, 11],
  // b3, b5, 3 -> 2
  dimsus2: [0, 2, 2, 5, 6, 9, 11],
  // b3, b5, 3 -> 4
  dimsus4: [0, 2, 6, 5, 6, 9, 11],
  // #5, 3 -> 2
  augsus2: [0, 2, 2, 5, 8, 9, 11],
  // #5, 3 -> 4
  augsus4: [0, 2, 5, 5, 8, 9, 11]
}

const chordAdditionIntervals: { [key in ChordAddition]: { degree: ChordDegreeNumber, interval: IntervalDistance } } = {
  add2: { degree: 2, interval: 2 },
  add4: { degree: 4, interval: 5 },
  add6: { degree: 6, interval: 9 },
  add9: { degree: 9, interval: 14 },
  add11: { degree: 11, interval: 17 },
  add13: { degree: 13, interval: 21 }
}

const chordAlterationInterval: { [key in ChordAlteration]: { degree: ChordDegreeNumber, baseInterval: IntervalDistance, alteredInterval: IntervalDistance } } = {
  b2: { degree: 2, baseInterval: 2, alteredInterval: 1 },
  '#2': { degree: 2, baseInterval: 2, alteredInterval: 3 },
  b3: { degree: 3, baseInterval: 4, alteredInterval: 3 },
  '#3': { degree: 3, baseInterval: 4, alteredInterval: 5 },
  b4: { degree: 4, baseInterval: 5, alteredInterval: 4 },
  '#4': { degree: 4, baseInterval: 5, alteredInterval: 6 },
  b5: { degree: 5, baseInterval: 7, alteredInterval: 6 },
  '#5': { degree: 5, baseInterval: 7, alteredInterval: 8 },
  b6: { degree: 6, baseInterval: 9, alteredInterval: 8 },
  '#6': { degree: 6, baseInterval: 9, alteredInterval: 10 },
  b7: { degree: 7, baseInterval: 11, alteredInterval: 10 },
  '#7': { degree: 7, baseInterval: 11, alteredInterval: 12 },
  b9: { degree: 9, baseInterval: 14, alteredInterval: 13 },
  '#9': { degree: 9, baseInterval: 14, alteredInterval: 15 },
  b11: { degree: 11, baseInterval: 17, alteredInterval: 16 },
  '#11': { degree: 11, baseInterval: 17, alteredInterval: 18 },
  b13: { degree: 13, baseInterval: 21, alteredInterval: 20 }
}

// Functions

function getAlterationInterval (chordType: ChordType, alteration: ChordAlteration): IntervalDistance {
  const degree = Number(alteration[1])
  const accidental = alteration[0]
  let adjustment = 0
  if (accidental === "#") {
    adjustment += 1
  } else if (accidental === "b") {
    adjustment -= 1
  }
  return chordTypeIntervals[chordType][normalizeValue(degree - 1 + adjustment, 12)]
}

function getAdditionInterval (chordType: ChordType, addition: ChordAddition): IntervalDistance {
  const degree = Number(addition[3])
  return chordTypeIntervals[chordType][normalizeValue(degree - 1, 12)]
}

function createChordWithDefaults (partialChord: Partial<Chord>): Required<Chord> {
  const chord: Required<Chord> = Object.assign(chordDefaults, partialChord)
  if (!partialChord.slash) {
    chord.slash = chord.root
  }
  return chord
}

export const chord = {
  setDefaults: createChordWithDefaults,
  notes: function (chord: Chord): ModeKeyNote[] {
    return []
  },
  intervals: function (chord: Chord): IntervalData[] {
    const chordWithDefaults = createChordWithDefaults(chord)

    // Get base chord intervals based on extension
    const chordIntervals: IntervalDistance[] = []
    for (let i = 0; i < chordWithDefaults.extension; i++) {
      if (i % 2 === 0) {
        chordIntervals.push(chordTypeIntervals[chordWithDefaults.type][normalizeValue(i, 7)])
      }
    }

    // Add chord addition intervals
    chordWithDefaults.additions.forEach(addition => {
      chordIntervals.push(getAdditionInterval(chordWithDefaults.type, addition))
    })

    // Replace chord alteration intervals
    const alteredIntervals = chordIntervals.map(interval => {
      let newInterval = interval
      chordWithDefaults.alterations.forEach(alteration => {
        if (interval === chordAlterationInterval[alteration].baseInterval) {
          newInterval = getAlterationInterval(chordWithDefaults.type, alteration)
        }
      })
      return newInterval
    })

    const deduplicatedIntervals = removeDuplicates(alteredIntervals)

    deduplicatedIntervals.sort((a, b) => a - b)

    const intervalData = deduplicatedIntervals.map(intervalDistance => interval.getIntervalData(intervalDistance))

    return intervalData
  }
}