<script>
  let promise = getVerifications();
  const rg = /<BODY>(?<table>[\s\S]*)<\/BODY>/i;

  async function getVerifications() {
    const res = await fetch(`test.html`);
    const text = await res.text();

    if (res.ok) {
      const table = text.match(rg).groups.table;
      const shadowTable = document.createElement('template');
      shadowTable.innerHTML = table;
      const res = shadowTable.content.querySelector('tbody');
      return res;
    } else {
      throw new Error(text);
    }
  }

  function handleClick() {
    promise = getVerifications();
  }
</script>

<button on:click={handleClick}>
  Fetch verifications
</button>

{#await promise}
  <p>...waiting</p>
{:then source}
  <p>Source is: {source}</p>
{:catch error}
  <p style="color: red">{error.message}</p>
{/await}
