# Make the whole Word file right-to-left and «Justify Low» by default, so any new paragraph, table cell or list the user adds is Arabic RTL too.
import sys, zipfile, re, shutil
for path in sys.argv[1:]:
    zin = zipfile.ZipFile(path); items = {n: zin.read(n) for n in zin.namelist()}; zin.close()
    st = items["word/styles.xml"].decode()
    st = st.replace("<w:pPrDefault/>", '<w:pPrDefault><w:pPr><w:bidi/><w:jc w:val="lowKashida"/></w:pPr></w:pPrDefault>')
    st = st.replace("<w:rtl/></w:rPr></w:rPrDefault>", '<w:rtl/><w:lang w:val="ar-SA" w:eastAsia="en-US" w:bidi="ar-SA"/></w:rPr></w:rPrDefault>')
    # every built-in paragraph style (Normal, list, table text…) right-to-left as well
    st = re.sub(r'(<w:style w:type="paragraph"[^>]*>)((?:(?!</w:style>).)*?)(<w:pPr>)', r'\1\2\3<w:bidi/>', st, flags=re.S)
    items["word/styles.xml"] = st.encode()
    doc = items["word/document.xml"].decode()
    doc = doc.replace("<w:docGrid", "<w:bidi/><w:docGrid", 1) if "<w:bidi/><w:docGrid" not in doc else doc
    items["word/document.xml"] = doc.encode()
    tmp = path + ".tmp"
    with zipfile.ZipFile(tmp, "w", zipfile.ZIP_DEFLATED) as z:
        for n, b in items.items(): z.writestr(n, b)
    shutil.move(tmp, path)
print("ok")
