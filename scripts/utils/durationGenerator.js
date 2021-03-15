const durationGenerator = (time) => {
   const lasTime = new Date(time);
   const curTime = new Date();
   const durTime = curTime.getTime() - lasTime.getTime();
   const hours = Math.floor(durTime / 1000 / 60 / 60);
   const minutes = Math.floor((durTime / 1000 / 60 / 60 - hours) * 60);
   const seconds = Math.floor(((durTime / 1000 / 60 / 60 - hours) * 60 - minutes) * 60);
   const durationsHours = hours < 10 ? "0" + hours : hours;
   const durationsMinutes = minutes < 10 ? "0" + minutes : minutes;
   const durationsSeconds = seconds < 10 ? "0" + seconds : seconds;
   return durationsHours + ":" + durationsMinutes + ":" + durationsSeconds;
};

module.exports = { durationGenerator };
