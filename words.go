
package main

import (
  "os"
  "bufio"
  "strconv"
  "strings"
  "fmt"
)

func loadWordData(file_name string, max_words int) map[string] *Word {
  alpha_only := true
  bad_chars := "1234567890~`!@#$%&:;*()+=/"
  var words = make(map[string] *Word)

  file, err := os.Open(file_name)
  if err != nil {
    fmt.Println("Error: ", err)
    return words
  }

  reader := bufio.NewReader(file)
  i := 0
  oldWordText := ""
  for {
    line, _, err2 := reader.ReadLine()
    if err != nil {
      fmt.Println("Error: ", err2)
      break
    }
    pieces := strings.Split(string(line), "\t")

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
      if bad {
        continue
      }
    }

    year, _ := strconv.Atoi(pieces[1])
    count, _ := strconv.Atoi(pieces[2])
    pageCount, _ := strconv.Atoi(pieces[3])
    bookCount, _ := strconv.Atoi(pieces[4])

    _, ok := words[wordText]
    if !ok {
      if oldWordText != "" {
        if words[oldWordText].TotalBooks() < 50000 {
          delete(words, oldWordText)
          i--
        }
      }
      i++
      oldWordText = wordText
      if i == max_words {break}
      words[wordText] = NewWord(wordText)
    }
    words[wordText].AddEntry(year, count, pageCount, bookCount)
  }
  return words
}

type XYonly struct {
  Word string
  X float32
  Y int
}

type Word struct {
  Text string
  Counts map[string] Entry
}

type Entry struct {
  Year int
  Count int
  PageCount int
  BookCount int
}

func NewWord(text string) *Word {
  wordd := Word{Text:text}
  wordd.Counts = make(map[string] Entry)
  return &wordd
}

func (w *Word) TotalPageDensityVsBooks() XYonly {
  return XYonly{w.Text, w.TotalPageDensity(), w.TotalBooks()}
}

func (w *Word) Length() int {
  return len(w.Text)
}

func (w *Word) AddEntry(year, count, pageCount, bookCount int) {
  w.Counts[strconv.Itoa(year)] = Entry {year, count, pageCount, bookCount}
}

func (w *Word) TotalPageDensity() float32 {
  return float32(w.TotalCount()) / float32(w.TotalPages())
}

func (w *Word) PageDensity(year int) float32 {
  styear := strconv.Itoa(year)

  _, ok := w.Counts[styear]
  if !ok {return -1}

  return float32(w.Counts[styear].Count) / float32(w.Counts[styear].PageCount)
}

func (w *Word) String() string {
  str := w.Text
  str += " {BookCount = " + strconv.Itoa(w.TotalBooks())
  str += ", PageCount = " + strconv.Itoa(w.TotalPages())
  str += ", Count = " + strconv.Itoa(w.TotalCount())
  str += ", PageDensity = " +
    strconv.FormatFloat(float64(w.TotalPageDensity()), 'f', 2, 32)
  str+= "}"
  return str
}

func (w *Word) TotalCount() int {
  total := 0
  for _, entry := range w.Counts {
    total += entry.Count
  }
  return total
}

func (w *Word) TotalPages() int {
  total := 0
  for _, entry := range w.Counts {
    total += entry.PageCount
  }
  return total
}

func (w *Word) TotalBooks() int {
  total := 0
  for _, entry := range w.Counts {
    total += entry.BookCount
  }
  return total
}

