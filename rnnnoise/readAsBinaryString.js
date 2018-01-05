var file = new File("./asakai32.wav") ;		// 1つ目のファイル

// FileReaderを作成
var fileReader = new FileReader() ;

// 読み込み完了時のイベント
fileReader.onload = function () {
	console.log( fileReader.result ) ;	// バイナリ文字列
}

// 読み込みを実行
fileReader.readAsBinaryString(file);
