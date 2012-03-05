
package main

import (
  "os"
  "bufio"
  "strconv"
  "strings"
  "fmt"
  "encoding/json"
  "io/ioutil"
)

const (
  alpha_only = true // include/exclude words with non-alpha chars
  bad_chars = "1234567890~`!@#$%&:;*()+=/-[]{}|\\\"^" // chars that constitute excluded words
  count_cutoff = 100 // words with lower counts are excluded
  dump_freq = 25000 // word limit at which memory to file dump is performed
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
    fmt.Println("Error: ", err)
    return
  }

  err = ioutil.WriteFile(file_name, marshaled, os.ModePerm)
  if err != nil {
    fmt.Println("Error: ", err)
  }
}

func UnmarshalJsonList(file_name string) (words []*Word) {
  data, err := ioutil.ReadFile(file_name)
  if err != nil {
    fmt.Println("Error: ", err)
    return
  }

  err = json.Unmarshal(data, &words)
  if err != nil {
    fmt.Println("Error: ", err)
    return
  }

  return
}

func MarshalJsonMap(file_name string, words map[string]*Word) {
  marshaled, err := json.Marshal(words)
  if err != nil {
    fmt.Println("Error: ", err)
    return
  }

  err = ioutil.WriteFile(file_name, marshaled, os.ModePerm)
  if err != nil {
    fmt.Println("Error: ", err)
  }
}

func UnmarshalJsonMap(file_name string) (words map[string]*Word) {
  data, err := ioutil.ReadFile(file_name)
  if err != nil {
    fmt.Println("Error: ", err)
    return
  }

  err = json.Unmarshal(data, &words)
  if err != nil {
    fmt.Println("Error: ", err)
    return
  }

  return
}

func CleanupRawWords(file_name string) map[string] *Word {
  var words = make(map[string] *Word)

  // open file and check for errors
  file, err := os.Open(file_name)
  if err != nil {
    fmt.Println("Error: ", err)
    return words
  }
  defer file.Close()

  reader := bufio.NewReader(file)
  i := 0
  dump_count := 1
  oldWordText := ""
  for {
    line, _, err2 := reader.ReadLine()
    if err2 != nil {
      fmt.Println(err2)
      break
    }

    pieces := strings.Split(string(line), "\t")
    // skip this word if it doesn't have proper number of fields
    if len(pieces) != 5 {continue}

    wordText := strings.ToLower(pieces[0])

    // skip words with numeric or other bad chars
    if alpha_only {
      bad := false
      for _, char := range bad_chars {
        if strings.Contains(wordText, string(char)) {
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

    if _, ok := words[wordText]; !ok { // word is not already in list
      if oldWordText != "" {
        // remove word if it has too low statistics
        if words[oldWordText].TotalCount() < count_cutoff {
          delete(words, oldWordText)
          i--
        }
      }

      if i >= dump_freq {
        MarshalJsonList("clean" + strconv.Itoa(dump_count), words)
        words = make(map[string] *Word)
        i = 0
        dump_count++
      }

      i++
      oldWordText = wordText
      words[wordText] = NewWord(wordText)
    }
    words[wordText].AddEntry(year, count, pageCount, bookCount)
  }

  MarshalJsonList("clean" + strconv.Itoa(dump_count) + ".json", words)
  return words
}

type XYonly struct {
  W string // word text
  X float32 // x coordinate
  Y int // y coordinate
}

type Word struct {
  T string // word text
  C map[string] Entry // yearly count entries
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

// total page density vs. book count
func (w *Word) TotPgDenBkCnt() XYonly {
  return XYonly{w.T, w.TotalPageDensity(), w.TotalBooks()}
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

func (w *Word) PageDensity(year int) float32 {
  styear := strconv.Itoa(year)

  _, ok := w.C[styear]
  if !ok {return -1}

  return float32(w.C[styear].W) / float32(w.C[styear].P)
}

func (w *Word) String() string {
  str := w.T
  str += " {BookCount = " + strconv.Itoa(w.TotalBooks())
  str += ", PageCount = " + strconv.Itoa(w.TotalPages())
  str += ", Count = " + strconv.Itoa(w.TotalCount())
  str+= "}"
  return str
}

func (w *Word) TotalCount() int {
  total := 0
  for _, entry := range w.C {
    total += entry.W
  }
  return total
}

func (w *Word) TotalPages() int {
  total := 0
  for _, entry := range w.C {
    total += entry.P
  }
  return total
}

func (w *Word) TotalBooks() int {
  total := 0
  for _, entry := range w.C {
    total += entry.B
  }
  return total
}

