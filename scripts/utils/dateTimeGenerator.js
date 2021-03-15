const dateTimeGeneratorLog = () => {
   const d = new Date();
   const year = d.getFullYear();
   let month = d.getMonth();
   let date = d.getDate();
   let hh = d.getHours();
   let mm = d.getMinutes();
   let ss = d.getSeconds();
   const checkDateTime = (i) => {
      if (i < 10) {
         i = "0" + i;
      }
      return i;
   };
   month = checkDateTime(month + 1);
   date = checkDateTime(date);
   hh = checkDateTime(hh);
   mm = checkDateTime(mm);
   ss = checkDateTime(ss);
   return `${year}-${month}-${date} ${hh}:${mm}:${ss}`;
};

const dateTimeGeneratorServer = () => {
   const dateObj = new Date();
   const month = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Des"];
   const date = dateObj.getDate() + "-" + month[dateObj.getMonth()] + "-" + dateObj.getFullYear();
   const hours = dateObj.getHours();
   const minutes = dateObj.getMinutes();
   const seconds = dateObj.getSeconds();
   const formattedTime =
      date.toString() +
      " | " +
      hours.toString().padStart(2, "0") +
      ":" +
      minutes.toString().padStart(2, "0") +
      ":" +
      seconds.toString().padStart(2, "0");
   return formattedTime;
};

const dateTimeGeneratorClient = () => {
   const d = new Date();
   const seconds = d.getSeconds() < 10 ? "0" + d.getSeconds() : d.getSeconds();
   const minutes = d.getMinutes() < 10 ? "0" + d.getMinutes() : d.getMinutes();
   const hours = d.getHours() < 10 ? "0" + d.getHours() : d.getHours();
   const day = ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jum'at", "Sabtu"];
   const month = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];
   return day[d.getDay()] + ", " + d.getDate() + " " + month[d.getMonth()] + " " + d.getFullYear() + " | " + hours + ":" + minutes + ":" + seconds;
};

module.exports = { dateTimeGeneratorLog, dateTimeGeneratorServer, dateTimeGeneratorClient };
