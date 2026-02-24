const mesurements = [
  275344.70303201675, 564219.2947409153, 710819.4387569427, 972644.5574948788,
  1290213.752229929, 1533104.8915929794, 1879587.3264029026, 2134163.185288906,
  2332235.865414858, 2636606.4393908978, 2916809.3884608746, 3167297.8078808784,
  3553301.8144688606, 3854254.568167925, 4191107.3559188843, 4536343.957058907,
  4830150.143081903, 5245116.702986002, 5616126.50689292, 5898199.956637859,
];

const numberOfMesurements = mesurements.length;

console.log("Number of mesurements taken: ", numberOfMesurements);

const targetDailyRuns = 900;

console.log("Target daily runs of the process: ", targetDailyRuns);

const timeMesurements = mesurements.map((e) => {
  if (mesurements.indexOf(e) > 0)
    return e - mesurements[mesurements.indexOf(e) - 1];
  return e;
});

console.log("Time to complete each run: ", timeMesurements);

const avg = timeMesurements.reduce((a, b) => a + b, 0) / numberOfMesurements;

console.log("Average time to complete a run in ms: ", avg);

const avgToHours = avg / 1000 / 60 / 60;

console.log("Average time to complete a run in hours: ", avgToHours);

const hoursForDailyRuns = avgToHours * targetDailyRuns;

console.log(
  "Total hours to complete the target daily runs: ",
  hoursForDailyRuns
);

const numberOfInstancesToTarget = hoursForDailyRuns / 24;

console.log(
  "Numer of instances needed to complete the target daily runs in 24 hours: ",
  Math.ceil(numberOfInstancesToTarget)
);
