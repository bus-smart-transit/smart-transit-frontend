This folder is available for any local images you want to add later.

The hero background photo currently points directly to a Pexels stock
photo URL (set in src/pages/Landing/Hero.css), so nothing needs to be
placed in this folder for that to work. If you'd rather use your own
photo instead:

1. Save your image file into this folder (e.g. hero-bus.jpg).
2. In src/pages/Landing/Hero.css, replace the Pexels URL inside the
   .hero__banner background rule with: url("/images/hero-bus.jpg")
