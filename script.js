'use strict';

// prettier-ignore
const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

const form = document.querySelector('.form');
const containerWorkouts = document.querySelector('.workouts');
const inputType = document.querySelector('.form__input--type');
const inputDistance = document.querySelector('.form__input--distance');
const inputDuration = document.querySelector('.form__input--duration');
const inputCadence = document.querySelector('.form__input--cadence');
const inputElevation = document.querySelector('.form__input--elevation');
const deleteAllBtn = document.querySelector('.btn--delete-all');
const modal = document.querySelector('.modal');
const overlay = document.querySelector('.overlay');
const modalClose = document.querySelector('.modalClose');

class Workout {
  date = new Date();
  id = (Date.now() + ``).slice(-10);
  constructor(coords, distance, duration) {
    this.coords = coords;
    this.distance = distance;
    this.duration = duration;
  }
  _workoutDescription() {
    this.description = `${this.type[0].toUpperCase() + this.type.slice(1)} on ${
      months[this.date.getMonth()]
    } ${this.date.getDate()}`;
  }
}

class running extends Workout {
  type = `running`;
  constructor(coords, distance, duration, cadence) {
    super(coords, distance, duration);
    this.cadence = cadence;
    this.CalcPace();
    this._workoutDescription();
  }
  CalcPace() {
    this.pace = (this.duration / this.distance).toFixed(2);
  }
}

class cycling extends Workout {
  type = `cycling`;
  constructor(coords, distance, duration, elevationGain) {
    super(coords, distance, duration);
    this.elevationGain = elevationGain;
    this.CalcSpeed();
    this._workoutDescription();
  }
  CalcSpeed() {
    this.speed = ((this.distance / this.duration) * 60).toFixed(2);
  }
}

///////////////////////////////////////
///////////////////////////////////////
class App {
  #map;
  #mapEvent;
  #workouts = [];
  #mapZoom = 12;
  #marker;
  #markers = [];
  constructor() {
    this._getPosition();
    this._getLocalStorage();
    form.addEventListener(`submit`, this._newWorkout.bind(this));
    inputType.addEventListener(`change`, this._toggleField);
    containerWorkouts.addEventListener(`click`, this._goToMarker.bind(this));
    containerWorkouts.addEventListener(`click`, this.deleteWorkout.bind(this));
    deleteAllBtn.addEventListener(`click`, this.deleteAll.bind(this));
    //containerWorkouts.addEventListener(`click`, this.editForm.bind(this));
  }

  _getPosition() {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        this._loadMap.bind(this),
        function () {
          alert(`Cannot display the coordinates`);
        }
      );
    }
  }

  _toggleModal() {
    modal.classList.toggle(`hidden`);
    overlay.classList.toggle(`hidden`);
  }

  _loadMap(position) {
    this._toggleModal();
    let { latitude, longitude } = position.coords;
    this.#map = L.map('map').setView([latitude, longitude], this.#mapZoom);
    //map type
    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    }).addTo(this.#map);
    //create a marker
    this.#map.on(`click`, this._showForm.bind(this));
    this.#workouts.forEach(work => {
      this._renderMarker(work);
    });
    modalClose.addEventListener(`click`, this._toggleModal.bind(this));
  }

  _showForm(mapE) {
    this.#mapEvent = mapE;
    form.classList.remove(`hidden`);
    inputDistance.focus();
  }

  _toggleField() {
    inputCadence.closest(`.form__row`).classList.toggle(`form__row--hidden`);
    inputElevation.closest(`.form__row`).classList.toggle(`form__row--hidden`);
  }

  _newWorkout(e) {
    e.preventDefault();
    const isValid = function (...inputs) {
      return inputs.every(inp => isFinite(inp));
    };
    const positiveInp = function (...inputs) {
      return inputs.every(inp => inp > 0);
    };
    //get data from form
    const type = inputType.value;
    const distance = Number(inputDistance.value);
    const duration = Number(inputDuration.value);
    let { lat, lng } = this.#mapEvent.latlng;
    let workout;

    //If workout running, create running object
    if (type === `running`) {
      const cadence = Number(inputCadence.value);
      if (
        !isValid(distance, duration, cadence) ||
        !positiveInp(distance, duration, cadence)
      ) {
        alert(`must type positive and numeric values`);
        return;
      }
      workout = new running([lat, lng], distance, duration, cadence);
    }
    //If workout cycling, create cycling object
    if (type === `cycling`) {
      const elevation = Number(inputElevation.value);
      if (
        !isValid(distance, duration, elevation) ||
        !positiveInp(distance, duration)
      ) {
        alert(`must type positive and numeric values`);
        return;
      }
      workout = new cycling([lat, lng], distance, duration, elevation);
    }
    //add new object to workout array
    this.#workouts.push(workout);
    //render workout on list
    this._renderList(workout);
    //render workout on map as a marker
    this._renderMarker(workout);
    //hide and clear fields
    this._hideForm();
    //set storage
    this._setLocalStorage();
    //go to that new market
    this._setView(workout);
  }

  _setView(workout) {
    this.#map.setView(workout.coords, this.#mapZoom, {
      animation: true,
      pan: { duration: 0.5, easeLinearity: 1 },
    });
  }

  _hideForm() {
    inputDistance.value =
      inputCadence.value =
      inputDuration.value =
      inputElevation.value =
        ``;
    form.style.display = `none`;
    form.classList.add(`hidden`);
    setTimeout(() => (form.style.display = `grid`), 1000);
  }

  _renderList(workout) {
    let html = ` 
      <li class="workout workout--${workout.type}" data-id="${workout.id}">
      <button class="btn--close">❌</button>
      <button class="btn--edit">✏️</button>
      <h2 class="workout__title">${workout.description}</h2>
      <div class="workout__details">
        <span class="workout__icon">${
          workout.type === `running` ? `🏃‍♂️` : `🚴‍♀️`
        }</span>
        <span class="workout__value">${workout.distance}</span>
        <span class="workout__unit">km</span>
      </div>
      <div class="workout__details">
        <span class="workout__icon">⏱</span>
        <span class="workout__value">${workout.duration}</span>
        <span class="workout__unit">min</span>
      </div>`;
    if (workout.type === `running`) {
      html += `<div class="workout__details">
        <span class="workout__icon">⚡️</span>
        <span class="workout__value">${workout.pace}</span>
        <span class="workout__unit">min/km</span>
      </div>
      <div class="workout__details">
        <span class="workout__icon">🦶🏼</span>
        <span class="workout__value">${workout.cadence}</span>
        <span class="workout__unit">spm</span>
      </div>
    </li>`;
    }
    if (workout.type === `cycling`) {
      html += ` <div class="workout__details">
        <span class="workout__icon">⚡️</span>
        <span class="workout__value">${workout.speed}</span>
        <span class="workout__unit">km/h</span>
        </div>
        <div class="workout__details">
        <span class="workout__icon">⛰</span>
        <span class="workout__value">${workout.elevationGain}</span>
        <span class="workout__unit">m</span>
        </div>
    </li>`;
    }
    containerWorkouts.insertAdjacentHTML(`beforeend`, html);
  }

  _renderMarker(workout) {
    this.#marker = L.marker(workout.coords)
      .addTo(this.#map)
      .bindPopup(
        L.popup({
          autoClose: false,
          closeOnClick: false,
          className: `${workout.type}-popup`,
        })
      )
      .setPopupContent(
        `${workout.type === `running` ? `🏃‍♂️` : `🚴‍♀️`} ${workout.description}`
      )
      .openPopup();
    this.#markers.push(this.#marker);
  }

  _goToMarker(e) {
    if (containerWorkouts.querySelector(`.workout`)) {
      if (e.target.classList.contains(`btn--close-modal`)) return;
      const target = e.target.closest(`.workout`);
      if (!target) return;
      const targetWorkout = this.#workouts.find(
        work => work.id === target.dataset.id
      );
      this._setView(targetWorkout);
      this._hideForm();
    }
  }
  _setLocalStorage() {
    localStorage.setItem(`workouts`, JSON.stringify(this.#workouts));
  }
  _getLocalStorage() {
    const data = JSON.parse(localStorage.getItem(`workouts`));
    if (!data) return;
    this.#workouts = data;
    this.#workouts.forEach(work => {
      this._renderList(work);
    });
  }
  reset() {
    localStorage.removeItem(`workouts`);
    location.reload();
  }

  deleteWorkout(e) {
    const clicked = e.target;
    const targetWorkout = e.target.closest(`.workout`);
    if (!targetWorkout) return;
    const targetIndex = this.#workouts.findIndex(
      work => work.id === targetWorkout.dataset.id
    );
    if (clicked.classList.contains(`btn--close`)) {
      //from workouts array
      this.#workouts.splice(targetIndex, 1);
      //from DOM
      clicked.closest(`.workout`).remove();
      //from map
      this.#markers[targetIndex].remove();
      this.#markers.splice(targetIndex, 1);
      //hide any opened form
      this._hideForm();
    }
  }

  deleteAll(e) {
    const clicked = e.target;
    const targetBasquet = clicked.classList.contains(`btn--delete-all`);
    const workouts = document.querySelectorAll(`.workout`);
    if (!targetBasquet) return;
    //workouts array
    this.#workouts.splice(0);
    //DOM
    workouts.forEach(work => work.remove());
    //map
    this.#markers.forEach(marker => marker.remove());
    this.#markers.splice(0);
    //hide any opened form
    this._hideForm();
  }

  editForm(e) {
    // D-I-S-A-B-L-E-D-------D-I-S-A-B-L-E-D-------D-I-S-A-B-L-E-D-------D-I-S-A-B-L-E-D-------
    const toggleRunning = function () {
      inputCadence.closest(`.form__row`).classList.remove(`form__row--hidden`);
      inputElevation.closest(`.form__row`).classList.add(`form__row--hidden`);
    };
    const toggleCycling = function () {
      inputCadence.closest(`.form__row`).classList.add(`form__row--hidden`);
      inputElevation
        .closest(`.form__row`)
        .classList.remove(`form__row--hidden`);
    };
    const clicked = e.target;
    const targetWorkout = e.target.closest(`.workout`);
    if (!targetWorkout) return;
    const workout = this.#workouts.find(
      work => work.id === targetWorkout.dataset.id
    );

    if (clicked.classList.contains(`btn--edit`)) {
      form.classList.remove(`hidden`);
      form.style.display = `grid`;

      if (workout.type === `running`) {
        toggleRunning();
        inputDistance.value = workout.distance;
        inputDuration.value = workout.duration;
        inputCadence.value = workout.cadence;
      }
      if (workout.type === `cycling`) {
        toggleCycling();
        inputDistance.value = workout.distance;
        inputDuration.value = workout.duration;
        inputElevation.value = workout.elevationGain;
      }
    }
  }
}
const app1 = new App();
console.log(app1);
