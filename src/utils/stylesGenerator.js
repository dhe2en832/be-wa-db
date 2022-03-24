function hideElem(element) {
  document.querySelector(element).style.display = 'none';
}

function showElem(element) {
  document.querySelector(element).style.display = 'block';
}

function getElemText(element) {
  return document.querySelector(element).innerText;
}
function getChildElemCount(element) {
  return document.querySelector(element).childElementCount;
}

function setElemText(element, text) {
  document.querySelector(element).innerText = text;
}
function setElemHTML(element, html) {
  document.querySelector(element).innerHTML = html;
}
function setElemAttr(element, attrKey, attrValue) {
  document.querySelector(element).setAttribute(attrKey, attrValue);
}

function appendElem(element, html) {
  const beforeElem = document.querySelector(element);
  beforeElem.insertAdjacentHTML('beforeend', html);
}

function isHiddenElem(element) {
  const findElem = document.querySelector(element);
  return window.getComputedStyle(findElem).display === 'none';
}

module.exports = {
  hideElem,
  showElem,
  getElemText,
  getChildElemCount,
  setElemText,
  setElemHTML,
  setElemAttr,
  appendElem,
  isHiddenElem,
};
