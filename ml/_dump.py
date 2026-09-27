"""Throwaway helper: dump the code cells of the member-2/3 notebooks to text files."""
import glob
import io
import os

import nbformat

os.makedirs("ml/_dump", exist_ok=True)

for path in glob.glob("ml/*.ipynb"):
    nb = nbformat.read(open(path, encoding="utf-8"), as_version=4)
    out = io.StringIO()
    for i, cell in enumerate(nb.cells):
        if cell.cell_type != "code":
            continue
        out.write("\n--- CELL %d ---\n" % i)
        out.write(cell.source)
    name = os.path.splitext(os.path.basename(path))[0].replace("(", "_").replace(")", "")
    with open("ml/_dump/%s.txt" % name, "w", encoding="utf-8") as fh:
        fh.write(out.getvalue())
    print("wrote", name, len(out.getvalue()))
