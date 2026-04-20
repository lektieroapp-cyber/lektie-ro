<?xml version="1.0" encoding="UTF-8"?>
<xsl:stylesheet version="1.0"
  xmlns:xsl="http://www.w3.org/1999/XSL/Transform"
  xmlns:s="http://www.sitemaps.org/schemas/sitemap/0.9"
  xmlns:xhtml="http://www.w3.org/1999/xhtml">
  <xsl:output method="html" version="1.0" encoding="UTF-8" indent="yes"/>
  <xsl:template match="/">
    <html lang="da">
      <head>
        <meta charset="UTF-8"/>
        <title>Sitemap — LektieRo</title>
        <meta name="robots" content="noindex"/>
        <style>
          body {
            font-family: ui-sans-serif, system-ui, -apple-system, sans-serif;
            background: #F5EDDE;
            color: #1F2D1A;
            margin: 0;
            padding: 48px 24px;
          }
          .wrap {
            max-width: 960px;
            margin: 0 auto;
          }
          h1 {
            font-family: 'Fraunces', Georgia, serif;
            font-size: 2.25rem;
            margin: 0 0 8px;
          }
          p.lead {
            color: #556048;
            margin: 0 0 28px;
          }
          table {
            width: 100%;
            border-collapse: collapse;
            background: white;
            border-radius: 24px;
            overflow: hidden;
            box-shadow: 0 8px 24px rgba(31, 45, 26, 0.06);
          }
          th, td {
            text-align: left;
            padding: 14px 20px;
            border-bottom: 1px solid rgba(31, 45, 26, 0.05);
            font-size: 14px;
          }
          th {
            background: #E4F2EB;
            color: #556048;
            font-weight: 600;
            text-transform: uppercase;
            letter-spacing: 0.04em;
            font-size: 12px;
          }
          tr:last-child td { border-bottom: none; }
          a { color: #4F8E6B; text-decoration: none; word-break: break-all; }
          a:hover { text-decoration: underline; }
          .muted { color: #8A9280; font-variant-numeric: tabular-nums; }
          .chip {
            display: inline-block;
            padding: 2px 8px;
            border-radius: 999px;
            background: rgba(85, 96, 72, 0.1);
            color: #556048;
            font-size: 11px;
            font-weight: 600;
          }
        </style>
      </head>
      <body>
        <div class="wrap">
          <h1>Sitemap</h1>
          <p class="lead">
            <xsl:value-of select="count(s:urlset/s:url)"/> offentlige URL'er. Denne side vises
            til mennesker; crawlere modtager den samme XML.
          </p>
          <table>
            <thead>
              <tr>
                <th>URL</th>
                <th>Ændret</th>
                <th>Frekvens</th>
                <th>Prioritet</th>
              </tr>
            </thead>
            <tbody>
              <xsl:for-each select="s:urlset/s:url">
                <tr>
                  <td>
                    <a href="{s:loc}"><xsl:value-of select="s:loc"/></a>
                  </td>
                  <td class="muted"><xsl:value-of select="substring(s:lastmod, 1, 10)"/></td>
                  <td><span class="chip"><xsl:value-of select="s:changefreq"/></span></td>
                  <td class="muted"><xsl:value-of select="s:priority"/></td>
                </tr>
              </xsl:for-each>
            </tbody>
          </table>
        </div>
      </body>
    </html>
  </xsl:template>
</xsl:stylesheet>
