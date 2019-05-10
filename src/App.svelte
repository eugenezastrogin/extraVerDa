<script>
  let specificsFetch;
  let dataFetch;
  let displayControls = false;
  // initial 1 / classes 1 / competitors 2 / stages 3
  let stage = 0;
  let _class;
  let shooter;

  async function sendRequest(req) {
    const res = await fetch(req);
    const json = await res.json();

    if (res.ok) {
      return json;
    } else {
      throw new Error(json);
    }
  }

  function handleClickClasses() {
    displayControls = true;
    stage = 1;
    specificsFetch = sendRequest('classes');
  }

  function handleFetchData(e) {
    stage += 1;

    if (stage === 2) {
      _class = e.srcElement.id;
      dataFetch = sendRequest('competitors?class=' + _class);
    } else if (stage === 3) {
      displayControls = false;
      const num = e.srcElement.id.split(' ')[0].slice(1);
      shooter = e.srcElement.id;
      dataFetch = sendRequest('stages?n=' + num);
    }
  }

</script>

<button on:click={handleClickClasses}>
  Overall
</button>

<button on:click={handleClickClasses}>
  Combined Overall
</button>

{#if _class}
<button on:click={handleClickClasses}>
  {_class} by stage
</button>
{/if}

{#if shooter}
<button on:click={handleClickClasses}>
  Shooter by stage
</button>
{/if}
<br/>

<button on:click={handleClickClasses}>
  {_class || 'Выбрать класс'}
</button>

{#if _class}
<button on:click={handleClickClasses}>
  {shooter || 'Выбрать стрелка'}
</button>
{/if}
<br/>

{#if specificsFetch}
  {#await specificsFetch}
    <p>...запрашиваю</p>
  {:then data}
    {#each data as item}
      <button id={item} on:click={handleFetchData}>{item}</button><br/>
    {/each}
  {:catch error}
    <p style="color: red">{error.message}</p>
  {/await}
{/if}

{#if stage===3}
  {#await dataFetch}
    <p>...формирую данные</p>
  {:then data}
    <table>
      <tr>
        <th>Стейдж
        <th>Место
        <th>Процент
        <th>Очки
      </tr>
    {#each data as item}
      <tr>
        <td>{item.stage}
        <td>{item.RANK}
        <td>{item.STAGE_PERCENT}
        <td>{item.STAGE_POINTS}
      </tr>
    {/each}
     </table>
  {:catch error}
    <p style="color: red">{error.message}</p>
  {/await}
{/if}
