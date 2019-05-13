<script>
  export let viewType;
  export let data;
  export let shooter;
</script>

<style>
  table {
    border-collapse: collapse;
  }

  table, th, td {
    border: 1px solid black;
  }
</style>

{#if viewType==='stageView'}

<table>
  <tr>
    <th>№
    <th>Competitor
    <th>%
    <th>Time
    <th>Points
  </tr>
{#each data as item}
  <tr style={item.competitor_name==shooter ? 'background-color:#f1135a6b': ''}>
    <td>{item.RANK}
    <td>{item.competitor_name.split(' ').splice(1).join(' ')}
    <td>{item.percent}
    <td>{item.time}
    <td>{item.points}
  </tr>
{/each}
</table>

{:else if viewType==='shooterView'}

<table>
  <tr>
    <th>Stage
    <th>Place
    <th>%
    <th>Points
  </tr>
{#each data as item}
  <tr>
    <td>{item.stage}
    <td>{item.RANK}
    <td>{item.percent}
    <td>{item.points}
  </tr>
{/each}
</table>

{/if}
