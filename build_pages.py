#!/usr/bin/env python3
# Генерирует 4 страницы инструментов в тёмном дизайне Textify AI
import os
PUB = os.path.expanduser("~/aitools/public")

CSS = r"""
:root{--bg:#080c14;--card:#111827;--card-border:rgba(255,255,255,0.07);--card-hover:#161f31;--accent:#4f8ef7;--accent2:#7b5cf5;--accent3:#00d4a8;--text:#f0f4ff;--text2:#8b9dc3;--text3:#4a5a7a;--radius:16px;--radius-sm:10px;}
*{box-sizing:border-box;margin:0;padding:0}
html{scroll-behavior:smooth}
body{font-family:'DM Sans',sans-serif;background:var(--bg);color:var(--text);min-height:100vh;overflow-x:hidden}
body::before{content:'';position:fixed;inset:0;background-image:url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.03'/%3E%3C/svg%3E");pointer-events:none;z-index:0;opacity:.4}
.blob{position:fixed;border-radius:50%;filter:blur(120px);pointer-events:none;z-index:0;animation:pulse 8s ease-in-out infinite alternate}
.blob-1{width:600px;height:600px;background:rgba(79,142,247,0.07);top:-200px;left:-150px}
.blob-2{width:500px;height:500px;background:rgba(123,92,245,0.06);top:40%;right:-200px;animation-delay:-3s}
.blob-3{width:400px;height:400px;background:rgba(0,212,168,0.05);bottom:-100px;left:30%;animation-delay:-6s}
@keyframes pulse{from{transform:scale(1) translate(0,0)}to{transform:scale(1.15) translate(20px,-20px)}}
nav{position:sticky;top:0;z-index:100;display:flex;align-items:center;justify-content:space-between;gap:16px;padding:0 32px;height:64px;background:rgba(8,12,20,0.8);backdrop-filter:blur(20px);border-bottom:1px solid var(--card-border);flex-wrap:wrap}
.nav-logo{font-family:'Syne',sans-serif;font-weight:800;font-size:20px;background:linear-gradient(135deg,#fff,var(--accent));-webkit-background-clip:text;-webkit-text-fill-color:transparent;letter-spacing:-0.5px;text-decoration:none}
.nav-links{display:flex;gap:4px;flex-wrap:wrap}
.nav-links a{font-size:13px;color:var(--text2);text-decoration:none;padding:6px 12px;border-radius:999px;border:1px solid transparent;transition:all .15s;white-space:nowrap}
.nav-links a:hover{color:#fff;background:rgba(255,255,255,0.04)}
.nav-links a.active{color:var(--accent);border-color:rgba(79,142,247,0.3);background:rgba(79,142,247,0.1)}
.hero{position:relative;z-index:1;padding:64px 32px 36px;max-width:760px;margin:0 auto;text-align:center}
.eyebrow{display:inline-flex;align-items:center;gap:8px;font-size:12px;font-weight:500;letter-spacing:1.5px;text-transform:uppercase;color:var(--accent3);margin-bottom:22px;padding:8px 20px;border:1px solid rgba(0,212,168,0.2);border-radius:999px;background:rgba(0,212,168,0.05)}
.eyebrow span{width:6px;height:6px;border-radius:50%;background:var(--accent3);animation:blink 2s ease-in-out infinite}
@keyframes blink{0%,100%{opacity:1}50%{opacity:.3}}
h1{font-family:'Syne',sans-serif;font-weight:800;font-size:clamp(32px,4.5vw,52px);line-height:1.08;letter-spacing:-1.5px;margin-bottom:18px;color:#fff}
h1 em{font-style:normal;background:linear-gradient(135deg,var(--accent),var(--accent2));-webkit-background-clip:text;-webkit-text-fill-color:transparent}
.hero-sub{font-size:17px;font-weight:300;color:var(--text2);line-height:1.6;max-width:540px;margin:0 auto}
.work{position:relative;z-index:1;max-width:760px;margin:0 auto;padding:0 20px 40px}
textarea{width:100%;padding:16px;border:1.5px solid var(--card-border);border-radius:var(--radius);font-size:15px;resize:vertical;outline:none;font-family:inherit;background:var(--card);color:var(--text);transition:border .15s,box-shadow .15s;line-height:1.6}
textarea::placeholder{color:var(--text3)}
textarea:focus{border-color:var(--accent);box-shadow:0 0 0 3px rgba(79,142,247,.12)}
#input{height:180px}
.control-row{margin-top:14px;display:flex;flex-direction:column;gap:8px}
.control-row label{font-size:14px;color:var(--text2)}
.control-row label b{color:var(--accent)}
input[type=range]{width:100%;accent-color:var(--accent);cursor:pointer}
select{padding:12px 14px;border-radius:var(--radius-sm);border:1.5px solid var(--card-border);background:var(--card);color:var(--text);font-family:inherit;font-size:15px;outline:none;cursor:pointer}
select:focus{border-color:var(--accent)}
button.go{width:100%;margin-top:14px;padding:16px;background:linear-gradient(135deg,var(--accent),var(--accent2));color:#fff;border:none;border-radius:var(--radius);font-size:16px;font-weight:600;font-family:inherit;cursor:pointer;transition:transform .1s,filter .15s}
button.go:hover{filter:brightness(1.08)}
button.go:active{transform:scale(.99)}
button.go:disabled{opacity:.5;cursor:default}
.proc-stat{margin-top:14px;text-align:center;font-size:13px;color:var(--text3)}
.proc-stat b{color:var(--accent3);font-weight:600}
.result-section{display:none;margin-top:22px}
.result-section.show{display:block}
.result-label{font-size:13px;color:var(--text3);margin-bottom:8px;display:flex;justify-content:space-between;gap:12px}
#result{width:100%;min-height:140px;border:1.5px solid var(--card-border);background:var(--card);border-radius:var(--radius);padding:16px;font-size:15px;line-height:1.75;font-family:inherit;resize:vertical;outline:none;color:var(--text)}
#result:focus{border-color:var(--accent)}
.actions{display:flex;gap:8px;margin-top:12px;flex-wrap:wrap}
.action-btn{padding:10px 18px;border:1.5px solid var(--card-border);background:var(--card);border-radius:var(--radius-sm);cursor:pointer;font-size:13px;font-family:inherit;transition:all .15s;color:var(--text2)}
.action-btn:hover{background:var(--card-hover);color:#fff;border-color:rgba(79,142,247,0.25)}
.action-btn.blue{background:linear-gradient(135deg,var(--accent),var(--accent2));color:#fff;border-color:transparent}
.action-btn.blue:hover{filter:brightness(1.08)}
.info-section{position:relative;z-index:1;max-width:760px;margin:0 auto 48px;padding:0 20px}
.info-card{background:var(--card);border:1px solid var(--card-border);border-radius:var(--radius);padding:32px}
.info-card h2{font-family:'Syne',sans-serif;font-size:22px;font-weight:700;margin-bottom:14px;color:#fff}
.info-card p{font-size:15px;color:var(--text2);line-height:1.7;margin-bottom:12px}
.info-card p:last-child{margin-bottom:0}
.faq{position:relative;z-index:1;max-width:760px;margin:0 auto 64px;padding:0 20px}
.faq h2{font-family:'Syne',sans-serif;font-size:22px;font-weight:700;margin-bottom:16px;color:#fff}
.faq-item{background:var(--card);border:1px solid var(--card-border);border-radius:var(--radius-sm);margin-bottom:8px;overflow:hidden}
.faq-q{padding:16px 18px;font-weight:500;font-size:15px;cursor:pointer;display:flex;justify-content:space-between;align-items:center;gap:12px;color:#fff}
.faq-q:hover{background:var(--card-hover)}
.faq-arr{font-size:13px;color:var(--text3);transition:transform .2s}
.faq-item.open .faq-arr{transform:rotate(180deg)}
.faq-a{padding:0 18px 16px;color:var(--text2);font-size:14px;line-height:1.65;display:none}
.faq-item.open .faq-a{display:block}
footer{position:relative;z-index:1;border-top:1px solid var(--card-border);padding:32px;display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:12px}
.footer-logo{font-family:'Syne',sans-serif;font-weight:800;font-size:16px;background:linear-gradient(135deg,#fff,var(--accent));-webkit-background-clip:text;-webkit-text-fill-color:transparent}
.footer-copy{font-size:12px;color:var(--text3)}
.fade-up{opacity:0;transform:translateY(24px);transition:opacity .6s ease,transform .6s ease}
.fade-up.visible{opacity:1;transform:translateY(0)}
@media(max-width:700px){nav{padding:8px 16px;height:auto}.hero{padding:44px 20px 28px}}
"""

JS_TMPL = r"""
function updateCount(){var v=document.getElementById('result').value;var t=v.trim();var w=t?t.split(/\s+/).length:0;document.getElementById('charCount').textContent=w+' слов · '+v.length+' симв.';}
function copyResult(){navigator.clipboard.writeText(document.getElementById('result').value);var b=event.target,o=b.textContent;b.textContent='✅ Скопировано!';setTimeout(function(){b.textContent=o},2000);}
function downloadTxt(){var t=document.getElementById('result').value;if(!t)return;var blob=new Blob([t],{type:'text/plain;charset=utf-8'});var a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download='__FILE__';a.click();URL.revokeObjectURL(a.href);}
function reuseResult(){document.getElementById('input').value=document.getElementById('result').value;document.getElementById('resultSection').classList.remove('show');runTool();}
function showCounter(){var base=14820,launch=new Date('2026-05-29').getTime();var days=Math.max(0,Math.floor((Date.now()-launch)/86400000));var local=parseInt(localStorage.getItem('tx_count')||'0');document.getElementById('procCount').textContent=(base+days*143+local).toLocaleString('ru-RU');}
function incCounter(){localStorage.setItem('tx_count',(parseInt(localStorage.getItem('tx_count')||'0')+1));showCounter();}
async function runTool(){
 var text=document.getElementById('input').value.trim();
 if(!text){alert('Введи текст!');return;}
 var btn=document.getElementById('goBtn'),resultEl=document.getElementById('result');
 var ob=btn.textContent;btn.disabled=true;btn.textContent='⏳ Обрабатываю...';
 document.getElementById('resultSection').classList.add('show');
 resultEl.value='AI работает...';document.getElementById('charCount').textContent='';
 try{
  var body={toolType:'__TOOLTYPE__',userText:text__OPTIONS__};
  var res=await fetch('/api/tool',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});
  var data=await res.json();
  resultEl.value=data.result||data.error||'Ошибка';updateCount();
  if(data.result)incCounter();
 }catch(e){resultEl.value='Ошибка соединения с сервером';}
 btn.disabled=false;btn.textContent=ob;
}
"""

PAGE = r"""<!DOCTYPE html>
<html lang="ru">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>__TITLE__</title>
<meta name="description" content="__DESC__">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Syne:wght@400;600;700;800&family=DM+Sans:opsz,wght@9..40,300;9..40,400;9..40,500&display=swap" rel="stylesheet">
<style>__CSS__</style>
</head>
<body>
<div class="blob blob-1"></div><div class="blob blob-2"></div><div class="blob blob-3"></div>
<nav>
<a href="/" class="nav-logo">Textify AI</a>
<div class="nav-links">__NAV__</div>
</nav>
<div class="hero">
<div class="eyebrow"><span></span>__EYEBROW__</div>
<h1>__H1__</h1>
<p class="hero-sub">__SUB__</p>
</div>
<div class="work">
<textarea id="input" placeholder="__PLACEHOLDER__"></textarea>
__CONTROLS__
<button class="go" id="goBtn" onclick="runTool()">__BTN__</button>
<div class="proc-stat">Уже обработано текстов: <b id="procCount">—</b></div>
<div class="result-section" id="resultSection">
<div class="result-label"><span>Результат — можно редактировать</span><span id="charCount"></span></div>
<textarea id="result" oninput="updateCount()"></textarea>
<div class="actions">
<button class="action-btn" onclick="copyResult()">📋 Скопировать</button>
<button class="action-btn" onclick="downloadTxt()">⬇️ Скачать .txt</button>
<button class="action-btn blue" onclick="reuseResult()">🔁 Прогнать ещё раз</button>
</div>
</div>
</div>
<div class="info-section fade-up">__INFO__</div>
<div class="faq fade-up">
<h2>Частые вопросы</h2>
__FAQ__
</div>
<footer>
<span class="footer-logo">Textify AI</span>
<span class="footer-copy">© 2026 · Бесплатно на русском</span>
</footer>
<script>
__JS__
document.querySelectorAll('.faq-q').forEach(function(q){q.addEventListener('click',function(){q.parentElement.classList.toggle('open')});});
var obs=new IntersectionObserver(function(es){es.forEach(function(e){if(e.isIntersecting)e.target.classList.add('visible')})},{threshold:.1});
document.querySelectorAll('.fade-up').forEach(function(el){obs.observe(el)});
showCounter();
</script>
</body>
</html>"""

NAV_ITEMS = [("/gumanajzer.html","Гуманайзер","gumanajzer"),("/perepisat.html","Переписать","perepisat"),
("/sokrat.html","Сократить","sokrat"),("/restyle.html","Рерайт","restyle"),
("/rezyume.html","Резюме","rezyume"),("/idei.html","Идеи","idei")]

def build_nav(active):
    out=""
    for href,label,key in NAV_ITEMS:
        cls=' class="active"' if key==active else ''
        out+='<a href="%s"%s>%s</a>'%(href,cls,label)
    return out

def build_faq(items):
    return "".join('<div class="faq-item"><div class="faq-q">%s <span class="faq-arr">▾</span></div><div class="faq-a">%s</div></div>'%(q,a) for q,a in items)

def build_info(h2,paras):
    return '<div class="info-card"><h2>%s</h2>%s</div>'%(h2,"".join("<p>%s</p>"%p for p in paras))

SLIDER = r"""<div class="control-row"><label>До какого размера сократить: <b id="pctVal">50%</b></label><input type="range" id="pct" min="20" max="75" value="50" oninput="document.getElementById('pctVal').textContent=this.value+'%'"></div>"""
STYLE_SELECT = r"""<div class="control-row"><label>Стиль текста:</label><select id="style"><option value="business">Деловой</option><option value="casual">Разговорный</option><option value="social">Для соцсетей</option><option value="student">Студенческий</option></select></div>"""

TOOLS = [
{"file":"sokrat.html","active":"sokrat","tooltype":"shorten","options":",options:{percent:parseInt(document.getElementById('pct').value)}","controls":SLIDER,"dl":"textify-sokrat.txt",
 "title":"Сократить текст онлайн бесплатно — убрать воду из текста | Textify AI",
 "desc":"Бесплатное AI сокращение текста онлайн. Убирает воду и повторы, сохраняет смысл. Процент от 20% до 75%.",
 "eyebrow":"AI сокращение текста","h1":"Сократить текст <em>онлайн</em>",
 "sub":"Убираем воду, повторы и второстепенное — смысл остаётся. Выбери нужный объём от 20% до 75%.",
 "placeholder":"Вставь текст, который нужно сократить...","btn":"✂️ Сократить",
 "info_h2":"Когда нужно сократить текст","info_p":["Инструмент убирает воду, повторы и второстепенные детали, оставляя только главное. Укажи, до какого процента сократить — от 20% до 75% от исходного объёма.","Полезен для аннотаций, сокращения академических работ до нужного объёма, адаптации статей под соцсети или краткого пересказа длинного документа.","AI понимает структуру текста и убирает второстепенное, сохраняя ключевые факты и логику."],
 "faq":[("Какой минимальный процент?","Минимум 20% от исходного. Сильнее сокращать нецелесообразно — теряется смысл."),("Теряется ли важная информация?","AI старается сохранить ключевые факты, но всегда проверяй результат."),("Работает с большими текстами?","Да, но тексты больше 3000 слов лучше делить на части."),("Это бесплатно?","Полностью бесплатно, без регистрации.")]},

{"file":"restyle.html","active":"restyle","tooltype":"restyle","options":",options:{style:document.getElementById('style').value}","controls":STYLE_SELECT,"dl":"textify-rerayt.txt",
 "title":"Рерайт текста под стиль онлайн бесплатно — деловой, разговорный | Textify AI",
 "desc":"Бесплатный AI рерайт текста под стиль: деловой, разговорный, для соцсетей или студенческий. Один текст — разная подача.",
 "eyebrow":"AI рерайт под стиль","h1":"Рерайт текста <em>под стиль</em>",
 "sub":"Деловой, разговорный, для соцсетей или студенческий — один текст, разная подача.",
 "placeholder":"Вставь текст для рерайта...","btn":"🎨 Сделать рерайт",
 "info_h2":"Зачем менять стиль текста","info_p":["Рерайт перерабатывает текст в нужной тональности. Один и тот же текст можно подать строго и официально или легко и по-дружески — в зависимости от площадки и аудитории.","Деловой подойдёт для писем и документов, разговорный — для блога, для соцсетей — для коротких цепляющих постов, студенческий — для учебных работ.","Смысл сохраняется, меняется только манера подачи. Удобно быстро адаптировать готовый текст под разные каналы."],
 "faq":[("Чем рерайт отличается от переписывания?","Переписывание просто улучшает текст, а рерайт меняет его стиль и тональность под выбранную задачу."),("Сколько стилей доступно?","Четыре: деловой, разговорный, для соцсетей и студенческий."),("Смысл текста сохранится?","Да, меняется только подача и тон, смысл остаётся прежним."),("Это бесплатно?","Полностью бесплатно, без регистрации.")]},

{"file":"rezyume.html","active":"rezyume","tooltype":"resume","options":"","controls":"","dl":"textify-rezyume.txt",
 "title":"Улучшить резюме онлайн бесплатно — AI редактор резюме | Textify AI",
 "desc":"Бесплатное AI улучшение резюме онлайн. Сильные глаголы, конкретные достижения, убедительные формулировки.",
 "eyebrow":"AI улучшение резюме","h1":"Улучшить резюме <em>онлайн</em>",
 "sub":"Сильные глаголы, конкретные достижения, убедительные формулировки. AI улучшит за секунды.",
 "placeholder":"Вставь текст резюме или отдельные разделы...","btn":"✨ Улучшить резюме",
 "info_h2":"Как AI улучшает резюме","info_p":["Резюме — первое впечатление о кандидате. AI делает формулировки чёткими и убедительными: размытые фразы превращаются в конкретные достижения, слабые глаголы — в сильные.","Вставь полный текст резюме или отдельные разделы. Особенно хорошо работает с описанием опыта и навыков."],
 "faq":[("Нужно вставлять всё резюме?","Можно вставить как всё резюме, так и отдельные разделы — опыт, навыки, о себе."),("Изменится ли структура?","Структура сохраняется, меняются формулировки и стиль подачи."),("Подходит для любой сферы?","Да — IT, маркетинг, финансы, любые другие."),("Это бесплатно?","Полностью бесплатно, без регистрации.")]},

{"file":"idei.html","active":"idei","tooltype":"ideas","options":"","controls":"","dl":"textify-idei.txt",
 "title":"Идеи для контента онлайн бесплатно — генератор идей для постов | Textify AI",
 "desc":"Бесплатный AI генератор идей для контента. 10 идей для постов, видео и статей по любой теме.",
 "eyebrow":"Генератор идей","h1":"Идеи для <em>контента</em>",
 "sub":"10 идей для постов, видео, статей и Telegram по любой теме. Новые идеи каждый раз.",
 "placeholder":"Введи тему, например: фитнес после 40 для женщин...","btn":"💡 Придумать идеи",
 "info_h2":"Генератор идей для контента","info_p":["Контент-план — одна из самых сложных задач для блогера или маркетолога. Инструмент генерирует 10 идей для постов, видео или статей по любой теме.","Чем конкретнее тема — тем полезнее идеи. «Фитнес после 40 для женщин» лучше, чем просто «фитнес». Запускай несколько раз — каждый раз новые варианты.","Подходит для Instagram, ВКонтакте, Telegram, YouTube и любых других платформ."],
 "faq":[("Можно идеи для конкретной платформы?","Да, уточни в запросе: «идеи для Telegram-канала о финансах» — получишь точнее."),("Что если идеи не подходят?","Просто запусти ещё раз — каждый раз новые варианты."),("Сколько идей генерируется?","10 идей за один запрос. Можно запускать повторно."),("Это бесплатно?","Полностью бесплатно, без регистрации.")]},
]

for t in TOOLS:
    js = (JS_TMPL.replace("__TOOLTYPE__",t["tooltype"]).replace("__OPTIONS__",t["options"]).replace("__FILE__",t["dl"]))
    html = (PAGE
        .replace("__CSS__",CSS)
        .replace("__TITLE__",t["title"]).replace("__DESC__",t["desc"])
        .replace("__NAV__",build_nav(t["active"]))
        .replace("__EYEBROW__",t["eyebrow"]).replace("__H1__",t["h1"]).replace("__SUB__",t["sub"])
        .replace("__PLACEHOLDER__",t["placeholder"]).replace("__CONTROLS__",t["controls"])
        .replace("__BTN__",t["btn"])
        .replace("__INFO__",build_info(t["info_h2"],t["info_p"]))
        .replace("__FAQ__",build_faq(t["faq"]))
        .replace("__JS__",js))
    with open(os.path.join(PUB,t["file"]),"w",encoding="utf-8") as f:
        f.write(html)
    print("✓ создан", t["file"])

print("Готово! Все 4 страницы обновлены.")