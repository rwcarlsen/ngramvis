
serve: server.go words.go

	go build -o serve server.go words.go

run:

	./serve

clean:

	rm -f serve

