<script>
  import debounce from 'lodash.debounce';
  import { count } from './stores.js';
  import DataView from './DataView.svelte';

  // Promises
  let specificsFetch;
  let shooterStageFetch;
  let verificationPush;

  // Generic parameters
  let verificationPage = '';
  let competition_link = '';
  if (localStorage.getItem('competition_link')) {
    competition_link = localStorage.getItem('competition_link');
  }

  let _class;
  let shooter;
  let num;
  let stage;
  let viewType;

  // Stage incrementer stuff
  let initSubscription = true;
  let lastMode = 'combined';
  const incClassStage = debounce(getClassByStage, 300);
  const incComboStage = debounce(getCombinedStage, 300);

  const unsubscribe = count.subscribe(value => {
    stage = value;
    if (!initSubscription) {
      switch (lastMode) {
        case 'combined':
          incComboStage();
          break;
        case 'class':
          incClassStage();
          break;
        default:
          incComboStage();
      }
    } else {
      initSubscription = false;
    }
  });

  async function sendRequest(req) {
    const res = await fetch(req);

    if (res.ok) {
      return res.json();
    } else if (res.status === 412) {
      throw new Error('Bad Link!');
    } else {
      throw new Error();
    }
  }

  function handleChooseClass() {
    _class = undefined;
    shooter = undefined;
    shooterStageFetch = undefined;
    specificsFetch =
      sendRequest(`classes?e=${encodeURIComponent(competition_link)}`);
  }

  function handleChooseShooter() {
    shooter = undefined;
    shooterStageFetch = undefined;
    specificsFetch =
      sendRequest(`competitors?class=${_class}&e=${encodeURIComponent(competition_link)}`);
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
    shooterStageFetch =
      sendRequest(`stages?n=${num}&e=${encodeURIComponent(competition_link)}`);
    viewType = 'shooterView';
  }

  function getClassByStage() {
    lastMode = 'class';
    shooterStageFetch =
      sendRequest(`stages?class=${_class}&stage=${stage}&e=${encodeURIComponent(competition_link)}`);
    viewType = 'stageView';
  }

  function getCombinedStage() {
    lastMode = 'combined';
    shooterStageFetch =
      sendRequest(`stages?class=overall&stage=${stage}&e=${encodeURIComponent(competition_link)}`);
    viewType = 'stageView';
  }

  function getClassOverall() {
    shooterStageFetch =
      sendRequest(`overall?class=${_class}&e=${encodeURIComponent(competition_link)}`);
    viewType = 'overallView';
  }

  function getCombinedOverall() {
    shooterStageFetch =
      sendRequest(`overall?class=combined&e=${encodeURIComponent(competition_link)}`);
    viewType = 'overallView';
  }

  function extractEventName(address) {
    const rg = /results\/(.*)\/\?mode/i;
    const event_name = address.match(rg);
    if (event_name && event_name[1]) {
      return event_name[1];
    } else {
      return '';
    }
l }

  function setMatch() {
    _class = undefined;
    shooter = undefined;
    shooterStageFetch = undefined;
    specificsFetch = undefined;
    verificationPush =
      sendRequest(`match?e=${encodeURIComponent(verificationPage)}`)
      .then(res => {
        // Only save if verified by server!
        if (res.status !== 412) {
          competition_link = verificationPage;
          localStorage.setItem('competition_link', competition_link);
        }
      });
  }

</script>

<style>
  span {
    white-space:nowrap;
  }
  .smallfont {
    margin: 2em auto;
    color: grey;
    font-size: .7em;
  }
</style>

<form on:submit|preventDefault={setMatch}>
  <h2>
    {extractEventName(competition_link)}
    <br>
    {#if verificationPush}
      {#await verificationPush}
        ...
      {:then}
      {:catch error}
        <p style="color: red">{error.message}</p>
      {/await}
    {/if}
  </h2>

  <input bind:value={verificationPage} placeholder="Ссылка на верификацию">

  <button disabled={!verificationPage} type=submit>
    Отправить
  </button>
</form>

<hr>

<button disabled={_class===undefined} on:click={getClassOverall}>
  {_class || 'Class'} Overall
</button>

<button disabled={_class===undefined} on:click={getClassByStage}>
  {_class || 'Class'} by stage
</button>

<button on:click={getCombinedOverall}>
  Combined Overall
</button>

<button on:click={getCombinedStage}>
  Combined by stage
</button>

<button disabled={shooter===undefined} on:click={getShooterByStage}>
  Shooter by stage
</button>

<hr>

<button disabled={competition_link===''} on:click={handleChooseClass}>
  {_class || 'Выбрать класс'}
</button>

<button disabled={_class===undefined} on:click={handleChooseShooter}>
  {shooter ? shooter.split(' ').splice(1).join(' ') : shooter || 'Выбрать стрелка'}
</button>

<span>
  <button on:click={count.increment}>+</button>
    {stage} stage
  <button on:click={count.decrement}>-</button>
</span>

<br>

{#if specificsFetch}
  {#await specificsFetch}
    <p>...запрашиваю</p>
  {:then data}
    {#each data as item}
      <button on:click={_class ? handleClickShooter : handleClickClass}>
        {item}
      </button><br>
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

<div class="smallfont" align="center">
  eмаil: testerowtes at яндekс cом
  <br>
  2019 ©aethelz
</div>
