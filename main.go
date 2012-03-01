
package main

import (
  "io/ioutil"
  "strconv"
  "strings"
  "fmt"
  "os"
  "bufio"
  gosql "github.com/kuroneko/gosqlite3"
  "net/http"
  "encoding/json"
)

func main() {
  fmt.Println("Starting http server...")
  indexHandler := staticFileHandler("index.html")

  http.HandleFunc("/", indexHandler)
  http.HandleFunc("/data/", dataHandlerGen())
  err := http.ListenAndServe("0.0.0.0:8888", nil)
  if err != nil {
    fmt.Println(err)
  }
}

func staticFileHandler(file_name string) func(http.ResponseWriter,
                                               *http.Request) {
  file_data, _ := ioutil.ReadFile(file_name)

  return func(w http.ResponseWriter, req *http.Request) {
    fmt.Println("New Request")
    _, _ = w.Write(file_data)
  }
}

func dataHandlerGen() func(http.ResponseWriter, *http.Request) {
  words := loadWordData("/home/robert/grams2.csv")
  return func(w http.ResponseWriter, req *http.Request) {
    data := make([]WordPageDensity, 0)

    for _, word := range words {
      if word.Length() == 1 {continue}
      data = append(data, word.TotalPageDensityVsBooks())
    }

    marshalled, err := json.Marshal(data)
    if err != nil {
      fmt.Println("Error: ", err)
      return
    }

    _, _ = w.Write(marshalled)
  }
}

func loadWordData(file_name string) map[string] *Wordd {
  alpha_only := true
  bad_chars := "1234567890~`!@#$%&:;*()+=/"
  var words = make(map[string] *Wordd)

  file, err := os.Open(file_name)
  if err != nil {
    fmt.Println("Error: ", err)
    return words
  }

  reader := bufio.NewReader(file)
  max_words := 25
  i := 0
  for i < max_words {
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
      words[wordText] = NewWordd(wordText)
      i++
    }
    words[wordText].AddEntry(year, count, pageCount, bookCount)
  }
  return words
}

type Wordd struct {
  Text string
  Counts map[string] Entry
}

type Entry struct {
  Year int
  Count int
  PageCount int
  BookCount int
}

func NewWordd(text string) *Wordd {
  wordd := Wordd{Text:text}
  wordd.Counts = make(map[string] Entry)
  return &wordd
}

type WordPageDensity struct {
  Text string
  Count int
  BookCount int
  PageDensity float32
}

func (w *Wordd) TotalPageDensityVsBooks() WordPageDensity {
  return WordPageDensity{w.Text, w.TotalCount(), w.TotalBooks(),
    w.TotalPageDensity()}
}

func (w *Wordd) Length() int {
  return len(w.Text)
}

func (w *Wordd) AddEntry(year, count, pageCount, bookCount int) {
  w.Counts[strconv.Itoa(year)] = Entry {year, count, pageCount, bookCount}
}

func (w *Wordd) TotalPageDensity() float32 {
  return float32(w.TotalCount()) / float32(w.TotalPages())
}

func (w *Wordd) PageDensity(year int) float32 {
  styear := strconv.Itoa(year)

  _, ok := w.Counts[styear]
  if !ok {return -1}

  return float32(w.Counts[styear].Count) / float32(w.Counts[styear].PageCount)
}

func (w *Wordd) String() string {
  str := w.Text
  str += " {BookCount = " + strconv.Itoa(w.TotalBooks())
  str += ", PageCount = " + strconv.Itoa(w.TotalPages())
  str += ", Count = " + strconv.Itoa(w.TotalCount())
  str += ", PageDensity = " +
    strconv.FormatFloat(float64(w.TotalPageDensity()), 'f', 2, 32)
  str+= "}"
  return str
}

func (w *Wordd) TotalCount() int {
  total := 0
  for _, entry := range w.Counts {
    total += entry.Count
  }
  return total
}

func (w *Wordd) TotalPages() int {
  total := 0
  for _, entry := range w.Counts {
    total += entry.PageCount
  }
  return total
}

func (w *Wordd) TotalBooks() int {
  total := 0
  for _, entry := range w.Counts {
    total += entry.BookCount
  }
  return total
}

func loadSqliteData() {
  db, _ := gosql.Open("/home/robert/cycout/cyclus.sqlite")
  fmt.Println(db)
}

