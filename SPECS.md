# Context

I want to create a website which is hosted on github.io. I already managed to set up a dummy page with the correct domain: https://inno-grip.github.io/ 

I imagine a website that looks and works similiar to the following Bootstrap template:
https://startbootstrap.github.io/startbootstrap-clean-blog-jekyll/

Read the following instructions and decide how it should be implemented (by using Bootstrap templates or in some other way).

# Specs

The website should have two languages: German (DE) and English (EN), switchable in the header.

You don't need to translate any texts for me, just enable the functionality for this and put a clear comment how it works or what I should do to introduce the translations.

On the left side of the header put the INNO-GRIP logo (imgs/web/Logo.png).

As header background use imgs/web/IETC_roboter_25.jpg

The title on the Home page should read like this:
INNO-GRIP
Intelligenter Kleinteilegreifer unter Verwendung von Photogrammetrie und KI-Modellen in der automatisierten Montage

The top header should have sections / links to pages:
- Home
- See (with subpages in a drop-down list: "Overview" and "Result browser")
- Plan
- Grasp
- Integrate
- Papers
- Code
- About
- DE/EN switch button

On "Home" page put placeholders:
- simple text body (lorem ipsum)
- bold subsection label
- simple text body (lorem ipsum)
- foto (use img/web/260212_4.jpeg)

On "See" - "Overview" page put:
- simple text body (lorem ipsum)

On "See" - "Result browser" put:
- intro text: "We have tested different arrangement complexities - select one to inspect the results:"
- three simple box buttons in a horizontal alignment: "Single", "Multiple", "Stacked"
- by default, "Single" should be selected, but the content beneath the three selection buttons should be corresponding to the button clicked
- heading "Overall results (average over TIP3D_V2):" - make "TIP3D_V2" a hyperlink leading to https://zenodo.org/records/22771386
- table: 3 columns ("Metric", "DA3", "VGGT-Omega"), 4 rows ("Metric", "Chamfer distance", "CVPR@1.0mm", "CVPR@0.5mm") - just put some dummy numbers in the table - but specific for the toggled case so I can adjust them later myself
- some kind of horizontal line separator
- website part beneath the overview table:
- on the left side (about a half of the page width) - an interactive table with the following columns: Sample, Surface, Size, Shape, Complexity, Orientation (note: Orientation is only relevant for "Single" arrangement); to fill in the fields, use the corresponding Excel files in data/3dr; on mouse hover over a table row, display on the right half of the webpage:
- a table with three columns (can have transparent lines and borders): Algorithm, DA3, VGGT-Omega; rows: Algorithm, Screenshot, Chamfer distance, CVPR@1.0mm, CVPR@0.5mm
- in the screenshot row, display corresponding screenshots (use placeholders for now, but dynamically selecting the images to display: imgs/3dr_display)
- make sure the values of the metrics in the table are taken from corresponding data/3dr Excel files

