const products = document.getElementById('products');
const about = document.getElementById('about');
const switcher = document.getElementById('switcher');
const modeDisplay = document.getElementById('modeDisplay');

const initialP = products.className;
const initialA = about.className;

const modes = ['Original', 'Shrink Store Links', 'Widen Images']
let mode = 0

switcher.addEventListener('click', () => {
  mode++;
  if (mode >= 3) mode = 0

  products.className = initialP;
  about.className = initialA;

  if (mode === 1) {
    products.classList.remove('wide')
  } else if (mode === 2) {
    about.classList.add('wide')
  }

  updateDisplay()
})

updateDisplay()

function updateDisplay() {
  modeDisplay.innerText = modes[mode]
}