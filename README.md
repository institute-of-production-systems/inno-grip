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

## Scripts for automatic screenshot capture using CloudCompare

To download pointclouds from a remote server on a local machine and sort them into the browsing-friendly structure sorted by single/multiple/stacked instead of sample IDs, use `tools/download_pointclouds.sh`. To automatically make screenshots of the comparison pointclouds in the correct folder structure required by the website, use `tools/render_pointclouds.py`. Setup: install the [Windows CloudComPy package](https://www.simulation.openfields.fr/index.php/cloudcompy-downloads/3-cloudcompy-binaries/17-production-cloudcompy-binaries/5-windows-cloudcompy-binaries) and configure its Python environment following the [installation instructions](https://github.com/CloudCompare/CloudComPy/blob/master/doc/UseWindowsCondaBinary.md). The current Windows distribution uses Python 3.12.

Command used for batch screenshots:

```
python render_pointclouds.py "path\to\SOURCE\parent\directory\of\single,multiple,stacked\POINTCLOUDS\folders" "path\to\TARGET\parent\directory\of\single,multiple,stacked\PNG\folders" --eye -0.033106 -0.189458 0.147466 --look-at 0.068369 -0.087894 0.003926 --up 0.500439 0.499121 0.707417 --point-size 4 --width 1600 --height 1200 --limit 1
```

Check rendering with `--limit 1` first and then run the command without `--limit` argument to complete screenshots. In our case, there were 280 screenshots.
