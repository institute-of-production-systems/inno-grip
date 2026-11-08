# INNO-GRIP
Homepage for the INNO-GRIP project

## GitHub Pages website

The website is a static HTML, CSS and JavaScript site. It has no server-side
backend or build dependency and can be published from the repository root with
GitHub Pages. Navigation and the DE/EN language switch run in the browser.
Translations for the interface are in the `translations` object in `app.js`;
add the same keys to each language there when introducing or editing text.

The result browser reads `data/3dr/results.json`, which is generated from the
three Excel workbooks by the dependency-free exporter:

```powershell
python tools\export_3dr_data.py
```

Run the exporter after changing a workbook or adding screenshots, then publish
the updated JSON with the site. To add real reconstruction screenshots, put PNG
files in the matching `imgs/3dr_display/{single,multiple,stacked}/` folder using
the name `{sample}_{algorithm}.png`, where `{algorithm}` is `da3` or `vggt`.
For samples with an orientation, include it between the sample name and
algorithm, for example `{sample}_orientation_a_da3.png` or
`{sample}_orientation_a_vggt.png`. Until then, the result browser shows the
included algorithm-specific placeholder image.
