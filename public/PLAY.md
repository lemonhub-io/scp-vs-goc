Download and extract the **Static game ZIP**, then serve the extracted directory over HTTP or HTTPS.

For local play, open a terminal in that directory and run:

```sh
python3 -m http.server 8000 --bind 127.0.0.1
```

Open <http://localhost:8000/> in your browser. For a hosted copy, upload the contents to a static web server. PWA installation and offline caching work on HTTPS and localhost.

Site-109 Lockdown is released under [CC BY-SA 3.0](https://creativecommons.org/licenses/by-sa/3.0/). See the in-game credits for SCP Wiki attribution. Font licenses are included in the `fonts` directory.
