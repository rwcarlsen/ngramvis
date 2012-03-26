
package main

import (
  "os"
  "fmt"
  "path"
  "bufio"
  "strconv"
  "strings"
  "runtime"
  "encoding/json"
  "io/ioutil"
  "launchpad.net/mgo"
  "github.com/petar/GoLLRB/llrb"
)

const (
  alphaOnly = true // include/exclude words with non-alpha chars
  badChars = "1234567890~`!@#$%&:;*()+=/-[]{}|\\\"^" // chars that constitute excluded words
  countCutoff = 100 // words with lower counts are excluded
)

const (
  ngramsDir = "/home/robert/ngrams"
  ngramsBase = "grams"
  totsBase = "tots"
  ngramsExt = "csv"
  ngramsLow = 2
  ngramsHigh = 3
  maxWords = 10000
)

func MarshalJsonList(file_name string, words []*Word) {
  marshaled, err := json.Marshal(words)
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

func TreeToSlice(tree *llrb.Tree) []*Word {
  words := make([]*Word, tree.Len())
  count := 0
  for word := range tree.IterDescend() {
    words[count] = word.(*Word)
    count++
  }
  return words
}

func DbWrite(words []*Word) {
  // open connection to mongodb
  session, err := mgo.Dial(dbServer)
  if err != nil {
    fmt.Println(err)
  } else {
    defer session.Close()
  }

  collection := session.DB(dbName).C(collecName)
  for _, w := range words {
    err := collection.Insert(w)
    if err != nil {
      panic(err)
    }
  }
}

func NormCounts() (norm, pgnorm, bknorm map[int]float32) {
  fmt.Println("Loading total yearly counts.")
  norm = make(map[int]float32, 0)
  pgnorm = make(map[int]float32, 0)
  bknorm = make(map[int]float32, 0)

  fname := totsBase + "." + ngramsExt
  path := path.Join(ngramsDir, fname)

  // open file and check for errors
  file, err := os.Open(path)
  if err != nil {
    panic(err)
  }
  defer file.Close()

  reader := bufio.NewReader(file)
  for {
    line, _, err := reader.ReadLine()
    if err != nil {
      // probably EOF
      fmt.Println(err)
      break
    }

    pieces := strings.Split(string(line), "\t")

    // skip this year if it doesn't have proper number of fields
    if len(pieces) != 4 {
      continue
    }

    year, _ := strconv.Atoi(pieces[0])
    c, _ := strconv.Atoi(pieces[1])
    p, _ := strconv.Atoi(pieces[2])
    b, _ := strconv.Atoi(pieces[3])
    count := float32(c)
    pages := float32(p)
    books := float32(b)

    norm[year] = count
    pgnorm[year] = pages
    bknorm[year] = books
  }
  return
}

func lessWC(a, b interface{}) bool {
  return a.(*Word).TotalCount() <= b.(*Word).TotalCount()
}

func ProcessRaw() {
  NCPU := runtime.NumCPU()
  runtime.GOMAXPROCS(NCPU)

  tree := llrb.New(lessWC)
  ch := make(chan *Word, 100)
  dead := make(chan bool)
  for i := ngramsLow; i <= ngramsHigh; i++ {
    fname := ngramsBase + strconv.Itoa(i) + "." + ngramsExt
    path := path.Join(ngramsDir, fname)
    go CleanupRawWords(path, ch, dead)
  }

  deadcount := 0
  var done bool
  for {
    select {
      case word := <-ch:
        tree.InsertNoReplace(word)
        if tree.Len() > maxWords {
          tree.DeleteMin()
        }
      case <-dead:
        deadcount++
        if deadcount == ngramsHigh - ngramsLow + 1 {
          done = true
        }
    }
    if done {
      break
    }
  }
  words := TreeToSlice(tree)
  MarshalJsonList("top.json", words)
}

func CleanupRawWords(file_name string, ch chan *Word, dead chan bool) {
  defer func() {dead <- true}()

  norm, pgnorm, bknorm := NormCounts()
  fmt.Println("cleaning file ", file_name, "...")

  // open file and check for errors
  file, err := os.Open(file_name)
  if err != nil {
    panic(err)
  }
  defer file.Close()

  reader := bufio.NewReader(file)
  oldWordText := ""
  badWord := ""
  word := NewWord("")
  for {
    line, _, err := reader.ReadLine()
    if err != nil {
      // probably EOF
      fmt.Println(err)
      break
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
    c, _ := strconv.Atoi(pieces[2])
    p, _ := strconv.Atoi(pieces[3])
    b, _ := strconv.Atoi(pieces[4])
    count := float32(c) / norm[year]
    pageCount := float32(p) / pgnorm[year]
    bookCount := float32(b) / bknorm[year]

    // if wordText/data is a new word
    if oldWordText != wordText {
      oldWordText = wordText
      ch <- word
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
  totalCount float32
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

func (w *Word) AddEntry(year int, count, pageCount, bookCount float32) {
  w.C[strconv.Itoa(year)] = Entry {year, count, pageCount, bookCount}
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
  if w.totalCount == 0 {
    for _, entry := range w.C {
      w.totalCount += entry.W
    }
  }
  return w.totalCount
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

func (w *Word) String() string {
  return fmt.Sprint(w)
}

