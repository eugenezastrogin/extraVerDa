<script>
  import { count } from './stores.js';
  import Incrementer from './Incrementer.svelte';
  import Decrementer from './Decrementer.svelte';
  import DataView from './DataView.svelte';

  let specificsFetch;
  let shooterStageFetch;
  let viewType;

  let _class;
  let shooter;
  let num;
  let stage;
  let initSubscription = true;

  const unsubscribe = count.subscribe(value => {
    stage = value;
    initSubscription ? '' : getClassByStage();
    initSubscription = false;
  });

  async function sendRequest(req) {
    const res = await fetch(req);
    const json = await res.json();

    if (res.ok) {
      return json;
    } else {
      throw new Error(json);
    }
  }

  function handleChooseClass() {
    _class = undefined;
    shooter = undefined;
    specificsFetch = sendRequest('classes');
  }

  function handleChooseShooter() {
    shooter = undefined;
    specificsFetch = sendRequest('competitors?class=' + _class);
  }

  function handleChooseStage() {
    stage = undefined;
  }

  function handleClickClass(e) {
    shooter = undefined;
    _class = e.srcElement.innerText;
    specificsFetch = undefined;
  }

  function handleClickShooter(e) {
    shooter = e.srcElement.innerText;
    num = e.srcElement.innerText.split(' ')[0].slice(1);
    specificsFetch = undefined;
  }

  function getShooterByStage() {
    shooterStageFetch = sendRequest('stages?n=' + num);
    viewType = 'shooterView';
  }

  function getClassByStage() {
    shooterStageFetch = sendRequest(`stages?class=${_class}&stage=${stage}`);
    viewType = 'stageView';
  }

  function getOverall() {
  }

  function getCombinedOverall() {
  }

</script>

<style>
  #stage {
    width: 2em;
  }
</style>

<button on:click={getOverall}>
  Overall
</button>

<button disabled={_class===undefined} on:click={getClassByStage}>
  {_class || 'Class'} by stage
</button>

<button disabled={shooter===undefined} on:click={getShooterByStage}>
  Shooter by stage
</button>

<button on:click={getCombinedOverall}>
  Combined Overall
</button>

<button on:click={getCombinedOverall}>
  Combined by stage
</button>

<hr/>

<button on:click={handleChooseClass}>
  {_class || 'Выбрать класс'}
</button>

<button disabled={_class===undefined} on:click={handleChooseShooter}>
  {shooter ? shooter.split(' ').splice(1).join(' ') : shooter || 'Выбрать стрелка'}
</button>

<span hidden={_class===undefined}>
  <Incrementer/>
    {stage} stage
  <Decrementer/>
</span>

<br/>

{#if specificsFetch}
  {#await specificsFetch}
    <p>...запрашиваю</p>
  {:then data}
    {#each data as item}
      <button on:click={_class ? handleClickShooter : handleClickClass}>
        {item}
      </button><br/>
    {/each}
  {:catch error}
    <p style="color: red">{error.message}</p>
  {/await}
{/if}

{#if shooterStageFetch}
  {#await shooterStageFetch}
    <p>...формирую данные</p>
  {:then data}
    <DataView {viewType} {data} {shooter}/>
  {:catch error}
    <p style="color: red">{error.message}</p>
  {/await}
{/if}
