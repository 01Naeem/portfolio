// Renders structured data. The "<" escape means no value in the data can ever close the script tag early.
export default function JsonLd({ data }) {
  const list = Array.isArray(data) ? data : [data];
  return list.map((d, i) => (
    <script key={i} type="application/ld+json">{JSON.stringify(d).replace(/</g, '\\u003c')}</script>
  ));
}
