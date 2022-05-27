import Beholder from "./Beholder/index.js";

let config = {
  camera_params: {
    videoSize: 0, // The video size values map to the following [320 x 240, 640 x 480, 1280 x 720, 1920 x 1080]
    rearCamera: false, // Boolean value for defaulting to the rear facing camera. Only works on mobile
    torch: false, // Boolean value for if torch/flashlight is on. Only works for rear facing mobile cameras. Can only be set from init
  },
  detection_params: {
    minMarkerDistance: 2,
    minMarkerPerimeter: 0.01,
    maxMarkerPerimeter: 1,
    sizeAfterPerspectiveRemoval: 49,
  },
  feed_params: {
    contrast: 0,
    brightness: 0,
    grayscale: 0,
    flip: false,
  },
  overlay_params: {
    present: true, // Determines if the Beholder overlay will display or be invisible entirely via display: none
    hide: true, // Determines if the overlay should be hidden on the left of the screen or visible
  },
};

///////////////////////////////////////
///                                 ///
///              P5                 ///
///                                 ///
///////////////////////////////////////

let windowWidth = window.innerWidth;
let windowHeight = window.innerHeight;
let markers;
let images;
let sounds;

// Set Timeout between marker inputs?

window.preload = () => {
  Beholder.init("#detection-div", config);

  markers = [
    {
      label: "rock",
      marker: Beholder.getMarker(5),
    },
    {
      label: "paper",
      marker: Beholder.getMarker(6),
    },
    {
      label: "scissors",
      marker: Beholder.getMarker(7),
    },
  ];

  markers.forEach((m) => (m.marker.timeout = 300));

  images = {
    startButton: loadImage(
      "images/startGame.png"
    ),
    restartButton: loadImage(
      "images/restartGame.png"
    ),
    paper: loadImage(
      "images/Paper.png"
    ),
    rock: loadImage(
      "images/Rock.png"
    ),
    scissors: loadImage(
      "images/Scissors.png"
    ),
    paperLoses: loadImage(
      "images/PaperX.png"
    ),
    rockLoses: loadImage(
      "images/RockX.png"
    ),
    scissorsLoses: loadImage(
      "images/ScissorsX.png"
    ),
    paperWins: [
      loadImage(
        "images/rock-paper-1.png"
      ),
      loadImage(
        "images/rock-paper-2.png"
      ),
      loadImage(
        "images/rock-paper-3.png"
      ),
    ],
    rockWins: [
      loadImage(
        "images/rock-scissors-1.png"
      ),
      loadImage(
        "images/rock-scissors-2.png"
      ),
      loadImage(
        "images/rock-scissors-3.png"
      ),
    ],
    scissorsWins: [
      loadImage(
        "images/scissors-paper-1.png"
      ),
      loadImage(
        "images/scissors-paper-2.png"
      ),
      loadImage(
        "images/scissors-paper-3.png"
      ),
    ],
  };

  sounds = {
    bgm: loadSound(
      "audio/tinycade-bgm.mp3"
    ),
    wrong: loadSound(
      "audio/wrong.mp3"
    ),
    paperWins: loadSound(
      "audio/paper-rock-sfx.mp3"
    ),
    rockWins: loadSound(
      "audio/rock-scissors-sfx.mp3"
    ),
    scissorsWins: loadSound(
      "audio/paper-scissors-sfx.mp3"
    ),
  };
};

///////////////////////////////////////////////////////////////////////////////

let currentScene = "start";
let game;

window.setup = () => {
  createCanvas(windowWidth, windowHeight - 5);
  sounds["bgm"].setVolume(0.2);
  textFont("Mabook");
  // textFont("Press Start 2P");
  imageMode(CENTER);
  textAlign(CENTER);
};

window.draw = () => {
  Beholder.update();
  clear();
  background(255);

  switch (currentScene) {
    case "start":
      startScene();
      break;

    case "play":
      playScene();
      readResponses();
      break;

    case "end":
      endScene();
  }
};

window.mousePressed = () => {
  let bounds = {
    x1: width * 0.4,
    x2: width * 0.6,
    y1:
      height * 0.8 -
      0.5 *
        (images["startButton"].height *
          ((0.2 * width) / images["startButton"].width)),
    y2:
      height * 0.8 +
      0.5 *
        (images["startButton"].height *
          ((0.2 * width) / images["startButton"].width)),
  };

  if (
    mouseX > bounds.x1 &&
    mouseX < bounds.x2 &&
    mouseY > bounds.y1 &&
    mouseY < bounds.y2
  ) {
    if (currentScene === "start") {
      game = new Game(millis());
      game.roundTimestamp = millis();
      game.generateRound();
      currentScene = "play";
    }

    if (currentScene === "end") {
      game = undefined; // supposedly stops the game from being stored
      currentScene = "start";
    }
  }
};

window.keyPressed = () => {
  var response = "";
  var validResponse = false;

  switch (key) {
    case "a":
      response = "rock";
      validResponse = true;
      break;

    case "s":
      response = "paper";
      validResponse = true;
      break;

    case "d":
      response = "scissors";
      validResponse = true;
      break;

    case "w":
      game = new Game(millis());
      game.roundTimestamp = millis();
      game.generateRound();
      currentScene = "play";
  }

  if (validResponse) {
    game.rounds[0].getResult(response);
    game.roundTimestamp = millis();
    game.generateRound();
  }
};

///////////////////////////////////////////////////////////////////////////////

let markerExists = false;

function readResponses() {
  switch (currentScene) {
    case "start":
      markers.forEach((m, i) => {
        let scale = 0.1;
        let alpha = 50;

        if (m.marker.present) {
          scale = 0.2;
          alpha = 255;
        }

        tint(255, alpha);
        image(
          images[m.label],
          width * (0.3 + i * 0.2),
          height * 0.3 + sin((frameCount + i * 5) / 20) * 10,
          scale * width,
          images["rock"].height * ((scale * width) / images["rock"].width)
        );
      });
      break;

    case "play":
      let response;
      if (markerExists && markers.every((m) => !m.marker.present)) {
        markerExists = false;
      }

      if (!markerExists) {
        markers.forEach((m) => {
          if (m.marker.present) {
            markerExists = true;
            response = m.label;
          }
        });
      }

      if (response) {
        game.rounds[0].getResult(response);
        game.roundTimestamp = millis();
        game.generateRound();
      }
      break;
  }
}

///////////////////////////////////////////////////////////////////////////////

function endScene() {
  textAlign(LEFT, CENTER);
  text("Score", width * 0.3, height * 0.35);
  text("Lives", width * 0.3, height * 0.5);
  game.renderScore();
  game.renderLives();

  if (sounds["bgm"].isPlaying()) sounds["bgm"].stop();

  image(
    images["restartButton"],
    width * 0.5,
    height * 0.8,
    0.2 * width,
    images["restartButton"].height *
      ((0.2 * width) / images["restartButton"].width)
  );
}

function startScene() {
  readResponses();

  textSize(width * 0.025);
  textAlign(CENTER);
  text("Try out your markers!", width / 2, height * 0.65);

  tint(255, 255);
  image(
    images["startButton"],
    width * 0.5,
    height * 0.8,
    0.2 * width,
    images["startButton"].height * ((0.2 * width) / images["startButton"].width)
  );
}

function playScene() {
  textSize(width * 0.033);
  game.renderRounds();
  game.renderBar();
  game.renderScore();
  game.renderLives();

  if (!sounds["bgm"].isPlaying()) sounds["bgm"].play();

  if (game) {
    if (millis() - game.roundTimestamp >= game.roundDuration)
      game.generateRound();
    else if (millis() >= game.end || !game.lives) currentScene = "end";
  }
}

///////////////////////////////////////////////////////////////////////////////

class Game {
  // Game seems to just track data of each NEW game
  // where does this go when game ends
  constructor(startTime) {
    this.start = startTime;
    this.gameDuration = 300000;
    this.end = startTime + this.gameDuration;
    this.roundDuration = 3000;
    this.roundTimestamp;
    this.lives = 5;
    this.score = 0;
    this.streak = 0;
    this.rounds = [];
  }

  adjustRoundDuration() {
    let minD = 500;
    let delta = 100;

    if (this.score > 0 && this.streak % 5 === 0 && this.roundDuration > minD) {
      console.log("faster");
      this.roundDuration -= delta;
    }

    if (this.rounds[1] && this.rounds[1].result === "lose") {
      console.log("slower");
      this.roundDuration = 3000;
    }
  }

  generateRound() {
    this.roundTimestamp = millis(); // tracks time start

    let randomThrow = random(["rock", "paper", "scissors"]); //choose one item
    this.rounds.unshift(new Round(randomThrow)); // check OOP Round
    this.rounds.forEach((round, index) => {
      round.updateTargetX(index);
      round.updateTargetScale(index);
    });

    if (this.rounds.length > 4) this.rounds.pop();

    if (this.rounds[1] && !this.rounds[1].response) this.rounds[1].roundLost();
    this.adjustRoundDuration();
  }

  renderBar() {
    let progress =
      (this.roundDuration - (millis() - this.roundTimestamp)) /
      this.roundDuration;
    let progressFill = (1 - progress) * (width * 0.4);

    rectMode(CENTER);
    noFill();
    strokeWeight(2);
    rect(width * 0.5, height * 0.8, width * 0.4, height * 0.05);

    rectMode(CORNER);
    fill(0);
    rect(width * 0.3, height * 0.775, progressFill, height * 0.05);
  }

  renderLives() {
    for (let i = 0; i < this.lives; i++) {
      let widthP = 0.8;
      let heightP = 0.1;

      if (currentScene === "end") {
        widthP = 0.7;
        heightP = 0.5;
      }

      fill(0);
      circle(width * widthP - i * 50, height * heightP, 20);
    }
  }

  renderRounds() {
    this.rounds.forEach((round, index) => {
      if (round.posX > round.targetX) {
        if (index === 0) round.posX -= 16;
        else round.posX -= 15;
      }
      if (round.scale > round.targetScale)
        round.scale -= (0.01 * width) / images["rock"].width;

      if (round.result === "win") {
        if (!round.animationTime.start) round.setAnimation(millis());
        round.getAnimation();
      } else if (round.result === "lose")
        round.image = images[`${round.opponent}Loses`];
      else round.image = images[round.opponent];

      push();
      translate(round.posX, height / 2);
      scale(round.scale);
      image(round.image, 0, 0);
      pop();
    });
  }

  renderScore() {
    let scoreZeros = "";
    let scoreStr = game.score.toString();

    for (let i = 0; i < 5 - scoreStr.length; i++) {
      scoreZeros += "0";
    }

    fill(0);
    let widthP = 0.2;
    let heightP = 0.1;

    if (currentScene === "end") {
      widthP = 0.7;
      heightP = 0.35;
    }
    textAlign(RIGHT);
    text(scoreZeros + scoreStr, width * widthP, height * heightP);
  }
}

class Round {
  constructor(opponent) {
    this.opponent = opponent;
    this.response;
    this.result;

    this.posX = width * 1.2;
    this.scale = (0.15 * width) / images["rock"].width;
    this.targetX = width * 0.8;
    this.targetScale;

    this.animationTime = {};
    this.image;
  }

  updateTargetX(index) {
    if (index === 1) this.targetX = width * 0.6;
    else if (index > 1)
      this.targetX =
        width * 0.6 - (index - 1) * 2.5 * this.scale * images["rock"].width;
  }

  updateTargetScale(index) {
    if (index >= 1) this.targetScale = (0.08 * width) / images["rock"].width;
  }

  getResult(response) {
    if (
      (this.opponent === "rock" && response === "paper") ||
      (this.opponent === "paper" && response === "scissors") ||
      (this.opponent === "scissors" && response === "rock")
    )
      this.result = "win";
    this.response = response;

    if (this.result === "win") {
      game.score += 1;
      game.streak += 1;
      sounds[`${response}Wins`].play();
    } else this.roundLost();
  }

  roundLost() {
    this.result = "lose";
    game.lives -= 1;
    game.streak = 0;
    sounds["wrong"].play();
  }

  setAnimation(timestamp) {
    let animationDuration = 250;
    this.animationTime.start = timestamp;
    this.animationTime.mid = timestamp + animationDuration / 2;
    this.animationTime.end = timestamp + animationDuration;
  }

  getAnimation() {
    let frames = images[`${this.response}Wins`];
    if (
      millis() > this.animationTime.start &&
      millis() < this.animationTime.mid
    )
      this.image = frames[0];
    else if (
      millis() > this.animationTime.mid &&
      millis() < this.animationTime.end
    )
      this.image = frames[1];
    else this.image = frames[2];
  }
}
