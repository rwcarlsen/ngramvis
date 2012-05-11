
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
  ngramsLow = 1
  ngramsHigh = 10
  maxWords = 10000
  jsonWords = "top.json"
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

func TreeToWords(tree *llrb.Tree) []*Word {
  words := make([]*Word, tree.Len())
  count := 0
  for word := range tree.IterDescend() {
    words[count] = word.(*Word)
    count++
  }
  return words
}

func WordsToTree(slice []*Word, lessFunc func(a, b interface{}) bool) *llrb.Tree {
  tree := llrb.New(lessFunc)
  for _, word := range slice {
    tree.InsertNoReplace(word)
  }
  return tree
}

func TreeToXYonly(tree *llrb.Tree) []*XYonly {
  words := make([]*XYonly, tree.Len())
  count := 0
  for word := range tree.IterDescend() {
    words[count] = word.(*XYonly)
    count++
  }
  return words
}

func XYonlyToTree(slice []*XYonly, lessFunc func(a, b interface{}) bool) *llrb.Tree {
  tree := llrb.New(lessFunc)
  for _, word := range slice {
    tree.InsertNoReplace(word)
  }
  return tree
}

func NormCounts() (norm, pgnorm, bknorm map[int]int) {
  fmt.Println("Loading total yearly counts.")
  norm = make(map[int]int, 0)
  pgnorm = make(map[int]int, 0)
  bknorm = make(map[int]int, 0)

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
    count, _ := strconv.Atoi(pieces[1])
    pages, _ := strconv.Atoi(pieces[2])
    books, _ := strconv.Atoi(pieces[3])

    norm[year] = count
    pgnorm[year] = pages
    bknorm[year] = books
  }
  return
}

func lessWC(a, b interface{}) bool { return a.(*Word).TotalCount() <= b.(*Word).TotalCount()
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
    go cleanupRawWords(path, ch, dead)
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
  words := TreeToWords(tree)
  MarshalJsonList(jsonWords, words)
}

func cleanupRawWords(file_name string, ch chan *Word, dead chan bool) {
  defer func() {dead <- true}()

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
    count, _ := strconv.Atoi(pieces[2])
    pageCount, _ := strconv.Atoi(pieces[3])
    bookCount, _ := strconv.Atoi(pieces[4])

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
  S float32 // DOI score
  P float32 // color param
}

type Word struct {
  T string // word text
  C map[string] Entry // yearly count entries
  tc int
}

type Entry struct {
  Y int // year of count
  W int // word count
  P int // page count
  B int // book count
}

func NewWord(text string) *Word {
  word := Word{T:text}
  word.C = make(map[string] Entry)
  return &word
}

func (w *Word) Length() int {
  return len(w.T)
}

func (w *Word) AddEntry(year, count, pageCount, bookCount int) {
  w.C[strconv.Itoa(year)] = Entry {year, count, pageCount, bookCount}
}

func (w *Word) TotalPageDensity() float32 {
  return float32(w.TotalCount()) / float32(w.TotalPages())
}

func (w *Word) PageDensity(year string) float32 {
  _, ok := w.C[year]
  if !ok {return 0}

  return float32(w.C[year].W) / float32(w.C[year].P)
}

func (w *Word) TotalBookDensity() float32 {
  return float32(w.TotalCount()) / float32(w.TotalBooks())
}

func (w *Word) BookDensity(year string) float32 {
  _, ok := w.C[year]
  if !ok {return 0}
  
  return float32(w.C[year].W) / float32(w.C[year].B)
}

func (w *Word) Temperature(year string) float32 {
  entry, ok := w.C[year]
  if !ok {return 0}

  return float32(entry.W) / w.MaxCount()
}

func (w *Word) MaxCount() float32 {
  max := 0
  for _, entry := range w.C {
    if entry.W > max {
      max = entry.W
    }
  }
  return float32(max)
}

func (w *Word) TotalCount() int {
  if w.tc == 0 {
    for _, entry := range w.C {
      w.tc += entry.W
    }
  }
  return w.tc
}

func (w *Word) TotalPages() int {
  var total int
  for _, entry := range w.C {
    total += entry.P
  }
  return total
}

func (w *Word) TotalBooks() int {
  var total int
  for _, entry := range w.C {
    total += entry.B
  }
  return total
}

func (w *Word) String() string {
  return fmt.Sprint(w)
}

////////////////////////////
// score calculating code //
////////////////////////////
func BuildXY(words []*Word, scores []float32, xmapper, ymapper, paramMapper func(w *Word) float32) []*XYonly  {
  xyonly := make([]*XYonly, len(words))
  for i, w := range words {
    x := xmapper(w)
    y := ymapper(w)
    p := paramMapper(w)
    xyonly[i] = &XYonly{W:w.T, X:x, Y:y, P:p, S:scores[i]}
  }
  return xyonly
}

func Bk(year string) func(*Word) float32 {
  return func(w *Word) float32 {
    return float32(w.C[year].B)
  }
}

func Pden(year string) func(*Word) float32 {
  return func(w *Word) float32 {
    return w.PageDensity(year)
  }
}

func Bden(year string) func(*Word) float32 {
  return func(w *Word) float32 {
    return w.BookDensity(year)
  }
}

func Tmp(year string) func(*Word) float32 {
  return func(w *Word) float32 {
    return w.Temperature(year)
  }
}

func Cnt(year string) func(*Word) float32 {
  return func(w *Word) float32 {
    return float32(w.C[year].W)
  }
}

func Pg(year string) func(*Word) float32 {
  return func(w *Word) float32 {
    return float32(w.C[year].P)
  }
}

func Wlen(year string) func(*Word) float32 {
  return func(w *Word) float32 {
    return float32(w.Length())
  }
}

type Weights struct {
  Length float32
  Count float32
  Pages float32
  Books float32
  PageDen float32
  Temp float32
  BookDen float32
}

type Scorer func(w *Word) (float32, bool)

type ScoredWord struct {
  W *Word
  S float32
}

func WeightedScoreGenerator(year string, weights, maxes Weights) Scorer {
  return func(w *Word) (float32, bool) {
     if _, ok := w.C[year]; !ok {
       return 0, false
     }
     var score float32 = 0
     score += float32(w.Length()) / maxes.Length * weights.Length
     score += float32(w.C[year].W) / maxes.Count * weights.Count
     score += float32(w.C[year].P) / maxes.Pages * weights.Pages
     score += float32(w.C[year].B) / maxes.Books * weights.Books
     score += float32(w.PageDensity(year)) / maxes.PageDen * weights.PageDen
     score += float32(w.Temperature(year)) / maxes.Temp * weights.Temp
     score += float32(w.BookDensity(year)) / maxes.BookDen * weights.BookDen
     return score, true
  }
}

func GetScores(words []*Word, scorer Scorer) (scored []*Word, scores []float32) {
  scores = make([]float32, 0)
  scored = make([]*Word, 0)

  NCPU := runtime.NumCPU()
  runtime.GOMAXPROCS(NCPU)
  percpu := int(float32(len(words)) / float32(NCPU) + 1)
  ch := make(chan *ScoredWord, 100)
  dead := make(chan bool)
  if len(words) <= 100 {
    NCPU = 1
    percpu = len(words)
  }
  for i := 0; i < NCPU; i++ {
    start := i * percpu
    end := start + percpu
    if end > len(words) {
      end = len(words)
    }
    go calcScores(words[start:end], scorer, ch, dead)
  }

  done := false
  deadcount := 0
  for !done {
    select {
      case val := <-ch:
        scores = append(scores, val.S)
        scored = append(scored, val.W)
      case <-dead:
        deadcount++
        if deadcount == NCPU {
          done = true
        }
    }
  }
  return
}

func calcScores(words []*Word, scorer Scorer, ch chan *ScoredWord, dead chan bool) {
  defer func() {dead <- true}()
  for _, word := range words {
    score, ok := scorer(word)
    if ok {
      sw := ScoredWord{W:word, S:score}
      ch <- &sw
    }
  }
}

