
package main

import (
  "os"
  "bufio"
  "strconv"
  "strings"
  "encoding/json"
  "io/ioutil"
  "launchpad.net/mgo"
)

const (
  alphaOnly = true // include/exclude words with non-alpha chars
  badChars = "1234567890~`!@#$%&:;*()+=/-[]{}|\\\"^" // chars that constitute excluded words
  countCutoff = 100 // words with lower counts are excluded
)

func MarshalJsonList(file_name string, words map[string]*Word) {
  wordList := make([]*Word, len(words))

  count := 0
  for _, word := range words {
    wordList[count] = word
    count++
  }

  marshaled, err := json.Marshal(wordList)
  if err != nil {
    panic(err)
  }

  err = ioutil.WriteFile(file_name, marshaled, os.ModePerm)
  if err != nil {
    panic(err)
  }
}

func UnmarshalJsonList(file_name string) (words []*Word) {
  data, err := ioutil.ReadFile(file_name)
  if err != nil {
    panic(err)
  }

  err = json.Unmarshal(data, &words)
  if err != nil {
    panic(err)
  }

  return
}

func CleanupRawWords(file_name string) {
  // open file and check for errors
  file, err := os.Open(file_name)
  if err != nil {
    panic(err)
  }
  defer file.Close()

  // open connection to mongodb
  session, err := mgo.Dial(dbServer)
  if err != nil {
    panic(err)
  }
  defer session.Close()
  collection := session.DB(dbName).C(collecName)

  reader := bufio.NewReader(file)
  oldWordText := ""
  badWord := ""
  word := NewWord("")
  for {
    line, _, err := reader.ReadLine()
    if err != nil {
      panic(err)
    }

    pieces := strings.Split(string(line), "\t")

    // skip this word if it doesn't have proper number of fields
    if len(pieces) != 5 {
      continue
    }

    wordText := pieces[0]

    // skip entries that correspond to wordText pre-id'ed as bad
    if wordText == badWord {
      continue
    }

    // skip words with numeric or other bad chars
    if alphaOnly {
      bad := false
      for _, char := range badChars {
        if strings.Contains(wordText, string(char)) {
          badWord = wordText
          bad = true;
          break
        }
      }
      if bad {continue}
    }

    year, _ := strconv.Atoi(pieces[1])
    count, _ := strconv.Atoi(pieces[2])
    pageCount, _ := strconv.Atoi(pieces[3])
    bookCount, _ := strconv.Atoi(pieces[4])

    // if wordText/data is a new word
    if oldWordText != wordText {
      oldWordText = wordText

      // add word to mongodb if it has high enough stats
      if word.TotalCount() >= countCutoff {
        err = collection.Insert(&word)
        if err != nil {
          panic(err)
        }
      }

      // create new word val
      word = NewWord(wordText)
    }
    word.AddEntry(year, count, pageCount, bookCount)
  }
}

type XYonly struct {
  W string // word text
  X float32 // x coordinate
  Y float32 // y coordinate
}

type Word struct {
  T string // word text
  C map[string] Entry // yearly count entries
}

type Entry struct {
  Y int // year of count
  W float32 // word count
  P float32 // page count
  B float32 // book count
}

func NewWord(text string) *Word {
  word := Word{T:text}
  word.C = make(map[string] Entry)
  return &word
}

// total page density vs. book count
func (w *Word) TotPgDenBkCnt() XYonly {
  return XYonly{w.T, w.TotalPageDensity(), w.TotalBooks()}
}

func (w *Word) Length() int {
  return len(w.T)
}

func (w *Word) AddEntry(year, count, pageCount, bookCount int) {
  nCount, nPages, nBooks := normCounts(year, count, pageCount, bookCount)
  w.C[strconv.Itoa(year)] = Entry {year, nCount, nPages, nBooks}
}

func normCounts(year, count, pageCount, bookCount int) (nCount, nPages, nBooks float32) {
  panic("not implemented yet")
}

func (w *Word) TotalPageDensity() float32 {
  return float32(w.TotalCount()) / float32(w.TotalPages())
}

func (w *Word) PageDensity(year int) float32 {
  styear := strconv.Itoa(year)

  _, ok := w.C[styear]
  if !ok {return -1}

  return float32(w.C[styear].W) / float32(w.C[styear].P)
}

func (w *Word) TotalCount() float32 {
  var total float32
  for _, entry := range w.C {
    total += entry.W
  }
  return total
}

func (w *Word) TotalPages() float32 {
  var total float32
  for _, entry := range w.C {
    total += entry.P
  }
  return total
}

func (w *Word) TotalBooks() float32 {
  var total float32
  for _, entry := range w.C {
    total += entry.B
  }
  return total
}

