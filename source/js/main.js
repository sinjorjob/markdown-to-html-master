// マウスカーソルの位置を取得する関数
// テキストエリア内のカーソル位置を取得し、その位置に新たなテキストを挿入するために使用
function getCursorPosition(textarea) {
    var start = textarea.selectionStart;
    return start;
}
function setCursorPosition(textarea, position) {
    textarea.selectionStart = position;
    textarea.selectionEnd = position;
    textarea.focus();
}




// マークダウンのテキストを解析し、見出しを取得する関数
function getHeadings(markdown) {
    // 見出しを取得する正規表現
    var regex = /^(#{1,6})\s+(.*)$/;
    var lines = markdown.split('\n');
    var inCodeBlock = false;
    var headings = [];
    lines.forEach(function(line) {
        if (line.startsWith('```')) {
            inCodeBlock = !inCodeBlock;
        }
        if (!inCodeBlock) {
            var match = regex.exec(line);
            if (match !== null) {
                headings.push({
                    level: match[1].length,
                    text: match[2]
                });
            }
        }
    });
    return headings;
}
// 取得した見出しを元に目次を生成する関数
function generateTableOfContents(headings) {
    var toc = '# 目次\n';
    headings.forEach(function (heading) {
        var link = '#' + encodeURIComponent(heading.text);
        toc += Array(heading.level + 1).join('  ') + '- [' + heading.text + '](' + link + ')\n';
    });
    return toc;
}


document.getElementById('uploadImageButton').addEventListener('click', function () {
    document.getElementById('imageUpload').click();
});
// 画像データを管理するためのマップ
var images = {};

document.getElementById('imageUpload').addEventListener('change', function (e) {
    var file = e.target.files[0];
    if (!file) return;

    var reader = new FileReader();
    reader.onload = function (e) {
        var editor = document.getElementById('editor');
        var cursorPosition = getCursorPosition(editor);
        var markdown = editor.value;
        var filename = file.name;

        markdown = markdown.slice(0, cursorPosition) + '\n<img alt="./images/' + filename + '" src="./images/' + filename + '" style="max-width: 800px;"  />\n' + markdown.slice(cursorPosition);

        editor.value = markdown;
        setCursorPosition(editor, cursorPosition);
        updatePreview();
    };
    reader.readAsDataURL(file);
});


// 保存ボタンがクリックされたときにマークダウンを保存する
document.getElementById('saveMarkdownButton').addEventListener('click', function () {
    var editor = document.getElementById('editor');
    var markdown = editor.value;
    var blob = new Blob([markdown], { type: 'text/plain' });
    this.href = URL.createObjectURL(blob);
});
// ページが読み込まれたときにローカルストレージからデータを取得し、テキストエリアと画像データにセットする
window.onload = function () {
    var savedMarkdown = localStorage.getItem('markdown');
    if (savedMarkdown) {
        document.getElementById('editor').value = savedMarkdown;
    }

    updatePreview(); // プレビューも更新する
}



// テキストエリアの内容が変更されたときにローカルストレージに保存する
document.getElementById('editor').addEventListener('input', function () {
    localStorage.setItem('markdown', this.value);
   //updatePreview(); 自動更新を無効化
});

// 「プレビューを更新」ボタンがクリックされたときにプレビューを更新
document.getElementById('updatePreviewButton').addEventListener('click', function () {
    updatePreview();
});


// レンダラーをカスタマイズ
var renderer = new marked.Renderer();
renderer.heading = function (text, level) {
    var escapedText = encodeURIComponent(text);
    return '<h' + level + ' id="' + escapedText + '">' + text + '</h' + level + '>';
};

// インラインコードのレンダリングをカスタマイズ
renderer.codespan = function (text) {
    return '<code>' + text + '</code>';
};

// alertのフォーマットを追加
renderer.paragraph = function (text) {
    if (text.startsWith('#alert')) {
        text = text.slice(6).trim();
        return '<div class="admonition attention"><p class="admonition-title">⚠️ 注意: </p><hr>' + text + '</div>'; /* タイトルに「注意（絵文字をつける）」を追加し、その後に改行とhr線を追加 */
    }
    if (text.startsWith('#info')) {
        text = text.slice(5).trim();
        return '<div class="admonition info"><p class="admonition-title">ℹ️ 情報: </p><hr>' + text + '</div>'; /* タイトルに「情報（絵文字をつける）」を追加し、その後に改行とhr線を追加 */
    }
    return '<p>' + text + '</p>';
};


marked.setOptions({
    renderer: renderer,
    highlight: function (code, language) {
        const validLanguage = hljs.getLanguage(language) ? language : 'plaintext';
        return hljs.highlight(validLanguage, code).value;
    },
    pedantic: false,
    gfm: true,
    breaks: false,
    sanitize: false,
    smartLists: true,
    smartypants: false,
    xhtml: false,
});

// "Insert Mermaid"ボタンがクリックされたときにMermaidのフォーマットを挿入する
document.getElementById('insertMermaidButton').addEventListener('click', function () {
    var editor = document.getElementById('editor');
    var cursorPosition = getCursorPosition(editor);
    var markdown = editor.value;
    markdown = markdown.slice(0, cursorPosition) + '\n```mermaid\nここにMermaidコードを記載する\n```\n' + markdown.slice(cursorPosition);
    editor.value = markdown;
    setCursorPosition(editor, cursorPosition);
    updatePreview();
});


function updatePreview() {
    var editor = document.getElementById('editor');
    var preview = document.getElementById('preview');
    var markdown = editor.value;

    // 目次を生成する
    if (markdown.includes('#目次')) {
        var headings = getHeadings(markdown);
        var toc = generateTableOfContents(headings);
        markdown = markdown.replace('#目次', toc);
    }

    // プレースホルダーを画像データに置き換え
    for (var placeholder in images) {
        var re = new RegExp('!\\[' + placeholder + '\\]\\(' + placeholder + '\\)', 'g');
        markdown = markdown.replace(re, '![' + placeholder + '](' + images[placeholder] + ')');
    }

    // Mermaidの解析
    var mermaidStartIndex = markdown.indexOf('```mermaid');
    var mermaidEndIndex = markdown.indexOf('```', mermaidStartIndex + 1);
    var mermaidCodes = [];
    while (mermaidStartIndex !== -1 && mermaidEndIndex !== -1) {
        var mermaidCode = markdown.slice(mermaidStartIndex + '```mermaid'.length, mermaidEndIndex).trim();
        mermaidCodes.push(mermaidCode);
        markdown = markdown.slice(0, mermaidStartIndex) + '<div class="mermaid">' + mermaidCode + '</div>' + markdown.slice(mermaidEndIndex + '```'.length);
        mermaidStartIndex = markdown.indexOf('```mermaid', mermaidEndIndex + 1);
        mermaidEndIndex = markdown.indexOf('```', mermaidStartIndex + 1);
    }

    preview.innerHTML = marked.parse(markdown);
    var mermaidDivs = preview.getElementsByClassName('mermaid');
    for (var i = 0; i < mermaidDivs.length; i++) {
        mermaidDivs[i].textContent = mermaidCodes[i];
        mermaid.initialize({ startOnLoad: true });
        mermaid.init(undefined, mermaidDivs[i]);
    }

    // プレビュー内のコードブロックにシンタックスハイライトを適用
    // setTimeoutを使用して非同期に行う
    setTimeout(function () {
        var codeBlocks = preview.querySelectorAll('pre code');
        codeBlocks.forEach((block) => {
            hljs.highlightBlock(block);

            // コピーボタンを作成
            var copyButton = document.createElement('button');
            copyButton.classList.add('copy-button');
            copyButton.textContent = 'Copy';

            // コピーボタンがクリックされたときの処理を追加
            copyButton.addEventListener('click', function() {
                // コードブロックのテキストをクリップボードにコピー
                var code = block.textContent;
                var textarea = document.createElement('textarea');
                textarea.textContent = code;
                document.body.appendChild(textarea);
                textarea.select();
                document.execCommand('copy');
                document.body.removeChild(textarea);

                // コピー完了のメッセージを表示
                alert('クリップボードにコピーしました。');
            });

            // コピーボタンをコードブロックに追加
            block.parentNode.style.position = 'relative';
            block.parentNode.appendChild(copyButton);
        });
    }, 0);
}

// 保存ボタンがクリックされたときにHTMLを保存する
document.getElementById('saveButton').addEventListener('click', function () {
    var preview = document.getElementById('preview');
    var html = `
    <!DOCTYPE html>
    <html>
    <head>
        <title>Markdown Output</title>
        <link rel="stylesheet" href="./css/default.min.css">
        <link href="https://fonts.googleapis.com/css2?family=Roboto&display=swap" rel="stylesheet">
        <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/highlight.js/10.7.2/styles/night-owl.min.css">
        <link href="https://fonts.googleapis.com/css2?family=Inconsolata:wght@400;700&display=swap" rel="stylesheet">
        <!-- highlight.jsのJSをCDNから読み込む -->
        ` + "<" + `script src="https://cdnjs.cloudflare.com/ajax/libs/highlight.js/10.7.2/highlight.min.js">` + "<" + `/script>
        <!-- ページの読み込みが完了したら、シンタックスハイライトを適用する -->
        ` + "<" + `script>
            document.querySelectorAll('pre code').forEach((block) => {
                hljs.highlightBlock(block);
            });
        ` + "<" + `/script>
        <style>
            body {
                background-color: #A100FF;
                color: white;
                font-family: 'Roboto', sans-serif;
                padding: 20px;
            }
            /* テーブルのスタイルを追加 */
            table {
                border-collapse: collapse;
            }
            th, td {
                border: 1px solid black;
                padding: 5px;
            }
            /* マークダウンの部分の背景色を白に設定 */
            .markdown {
                background-color: white;
                color: black;
                padding: 20px;
                border-radius: 10px;
            }
            /* アラートのデザインを修正 */
            .admonition {
                border: 1px solid #ff0000; /* 枠線を赤色に */
                border-left-width: 5px;
                border-radius: 4px;
                padding: 15px;
                margin-bottom: 20px;
                background-color: #ffffcc; /* 背景色を薄い黄色に */
            }
            .admonition-title {
                margin-top: 0;
                margin-bottom: 10px;
                font-weight: bold;
                color: #ff0000; /* タイトルの文字色を赤色に */
            }
            .admonition.attention {
                border-left-color: #ff0000; /* 左側の枠線を赤色に */
            }
            /* インフォメーションのデザインを追加 */
            .admonition.info {
                border: 1px solid #0000ff; /* 枠線を青色に */
                border-left-width: 5px;
                border-radius: 4px;
                padding: 15px;
                margin-bottom: 20px;
                background-color: #ccffff; /* 背景色を薄い青色に */
            }
            .admonition.info .admonition-title {
                color: #0000ff; /* タイトルの文字色を青色に */
            }
            code {
                background-color: #4b4b4b;
                color: #f0f0f0;
                padding: 2px 4px;
                border-radius: 4px;
                font-family: 'Inconsolata', monospace;
                font-size: 1.0em;  /* フォントサイズを小さく */
            }
            .copy-button {
                position: absolute;
                top: 0;
                right: 0;
                padding: 5px 10px;
                background-color: #4b4b4b;
                color: #f0f0f0;
                border: none;
                border-radius: 0 0 0 5px;
                cursor: pointer;
                opacity: 0.5;
                transition: opacity 0.3s ease;
            }
            
            .copy-button:hover {
                opacity: 1;
            
        </style>
    </head>
    <body>
        <div class="markdown">
            ${preview.innerHTML}
        </div>
        ` + "<" + `script>
            // コードブロックにコピーボタンを追加
            document.querySelectorAll('pre').forEach((block) => {
                // コピーボタンを作成
                var copyButton = document.createElement('button');
                copyButton.classList.add('copy-button');
                copyButton.textContent = 'Copy';

                // コピーボタンがクリックされたときの処理を追加
                copyButton.addEventListener('click', function() {
                    // コードブロックのテキストをクリップボードにコピー
                    var code = block.textContent;
                    var textarea = document.createElement('textarea');
                    textarea.textContent = code;
                    document.body.appendChild(textarea);
                    textarea.select();
                    document.execCommand('copy');
                    document.body.removeChild(textarea);

                    // コピー完了のメッセージを表示
                    alert('クリップボードにコピーしました。');
                });

                // コピーボタンをコードブロックに追加
                block.style.position = 'relative';
                block.appendChild(copyButton);
            });
        ` + "<" + `/script>


    </body>
    </html>
    `;
    var blob = new Blob([html], { type: 'text/html' });
    this.href = URL.createObjectURL(blob);
});


window.addEventListener('DOMContentLoaded', (event) => {
    const steps = document.querySelectorAll('.step');
    let currentStep = 0;

    function showStep() {
        // 全てのステップを非表示にする
        steps.forEach((step) => {
            step.classList.remove('show');
        });

        // 現在のステップを表示する
        steps[currentStep].classList.add('show');

        // 次のステップに進む、もしくは最初のステップに戻る
        currentStep = (currentStep + 1) % steps.length;
    }

    // 初回のステップ表示
    showStep();

    // 3秒ごとにステップを切り替える
    setInterval(showStep, 5000);
});