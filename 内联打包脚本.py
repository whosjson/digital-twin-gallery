import re, os

DIST = "/mnt/agents/output/app/dist"

html = open(f"{DIST}/index.html").read()
app_js = open(f"{DIST}/assets/app.js").read()
css = open(f"{DIST}/assets/index.css").read()

# 函数式替换，避免替换文本中的转义字符被正则模板解析
css_link_pattern = re.compile(r'<link rel="stylesheet"[^>]*href="/assets/index\.css"[^>]*/?>')
html = css_link_pattern.sub(lambda m: "<style>\n" + css + "\n</style>", html)

js_pattern = re.compile(r'<script type="module"[^>]*src="/assets/app\.js"[^>]*></script>')
html = js_pattern.sub(lambda m: '<script type="module">\n' + app_js + "\n</script>", html)

open(f"{DIST}/index.html", "w").write(html)
print("内联完成, index.html 大小:", round(len(html.encode('utf-8'))/1024), "KB")
