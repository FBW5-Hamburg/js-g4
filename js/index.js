
window.onload = () => {

    // sounds
    let coinSound = document.querySelector('#coinSound');
    let lavaSound = document.querySelector('#lavaSound');
    let levelCompleteSound = document.querySelector('#levelCompleteSound');
    let gameOverSound = document.querySelector('#gameOverSound');
    // playerNameInput and playButton
    let playerNameInput = document.querySelector('#playerNameInput');
    // let hiScoreInput = document.querySelector('#hiScoreInput');
    let playButton = document.querySelector('#playButton');
    let highScoreList = document.querySelector('#highScoreList');
    // scores
    let levelSpan = document.querySelector('#levelSpan');
    let livesSpan = document.querySelector('#livesSpan');
    let coinsSpan = document.querySelector('#coinsSpan');
    let scoreSpan = document.querySelector('#scoreSpan');
    // messages -> Won / Game Over 
    let message = document.querySelector('#message');

    // activating the game with playButton
    playButton.addEventListener('click', function(){
        scoreSpan.innerText = "00000";
        scoreCounter = 0; // resets the scoreCounter for the next player
        highScoreList.innerHTML = "";
        message.innerText = "";
        if (switcher == true) {
            runGame(GAME_LEVELS, DOMDisplay);
        }
    });

}

/// ----------- Simple Level Plan ----------- ///

var simpleLevelPlan = `
..............................
......#................#......
......#..............=.#......
......#.........o.o....#......
......#.@......#####...#......
......#####............#......
..........#++++++++++++#......
..........##############......
..............................`;

/// ------------ Create Level Reader ----------- ///

// creating a class that stores the level object.
// Its argument is the string that defines the level.
// To interpret the characters in the plan, the Level constructor uses the
// levelChars object, which maps background elements to strings and actor characters to classes.

class Level {
    constructor(plan) {
        let rows = plan.trim().split("\n").map(item => item.split(""))         
        this.height = rows.length;
        this.width = rows[0].length;
        this.startActors = []; // stored in an array of objects
        
        // each 'rows' holds an array of arrays with characters, the rows of the level plan.
        // map passes the array index as a second argument to the mapping function,
        // which tells us the x- and y-coordinates of a given character.
        this.rows = rows.map((row, y) => {
            return row.map((ch, x) => {
                let type = levelChars[ch];
                if (typeof type == "string") {
                    return type;
                }
                this.startActors.push(type.create(new Vec(x, y), ch));
                return "empty";
            });
        });        
    }
}


/// --------------- Set Status -------------- ///

// State class to track the state of a running game

class State {
    constructor(level, actors, status) {
        this.level = level;
        this.actors = actors;
        this.status = status;
    }

    static start(level) {
        return new State(level, level.startActors, "playing");
    }

    get player() {
        return this.actors.find(a => a.type == "player");
    }
}


/// ---------- Position ---------- ///

// The position of the actor is stored as a Vec object.
// the Vec class is used for the two-dimensional values, such as
// the position and size of actors.
// Vec object with x- and y-value --> Vec {x: 1, y: 1}
// function plus for vector addition, function times for vector multiplication, e.g. for jumping
// main "helping" object to be able to find and give the different actors their position in the grid of the game.

class Vec {
    constructor(x, y) {
        this.x = x;
        this.y = y;
    }
    plus(other) {
        return new Vec(this.x + other.x, this.y + other.y);
    }
    times(factor) {
        return new Vec(this.x * factor, this.y * factor);
    }
}


/// ------------- Actors in the Game ------------ ///

// static create method is used by the Level constructor
// to create an actor from a character in the level plan.

class Player {
    constructor(pos, speed) {
        this.pos = pos;
        this.speed = speed;
    }
    get type() {
        return "player";
    }
    static create(pos) {
        let newPosVec = new Vec(0, -0.5);
        let speedVec = new Vec(0, 0);
        let newPos = pos.plus(newPosVec);
        return new Player(newPos, speedVec);
    }
}
// the size of neither/non of the Actors will change.
// So it is stored on .prototype rather than in the object itself
// using type would create and return a new Vec object every time the property is read
Player.prototype.size = new Vec(0.8, 1.5);


class Lava {
    constructor(pos, speed, reset) {
        this.pos = pos;
        this.speed = speed;
        this.reset = reset;
    }
    get type() {
        return "lava";
    }
    // conditions to check for 'moving' lava
    static create(pos, ch) {
        if (ch == "=") {
            return new Lava(pos, new Vec(2, 0)); // move to left or right
        } else if (ch == "|") {
            return new Lava(pos, new Vec(0, 2)); // move down
        } else if (ch == "v") {
            return new Lava(pos, new Vec(0, 3), pos); // move down and back to its position before
        }
    }
}
Lava.prototype.size = new Vec(1, 1);


// coins would move up and down synchronously, the starting phase of each coin is randomized to avoid that.
// multiply the value returned by Math.random by 2 π to give the coin a random starting position on the wave
// the width/range the wave of a circle produces, is 2 π
// range of a Circle = 2π * r, random gives a number between 0 and 1, also a position on the circular orbit.
// beginning = 0, end = 1, 0 and 1 are same position

class Coin {
    constructor(pos, basePos, wobble) {
        this.pos = pos;
        this.basePos = basePos;
        this.wobble = wobble;
    }
    get type() {
        return "coin";
    }
    static create(pos) {
        let basePos = pos.plus(new Vec(0.2, 0.1)); // shift the starting position to center the coins
        return new Coin(basePos, basePos, Math.random() * Math.PI * 2);
    }
}
Coin.prototype.size = new Vec(0.6, 0.6);


// define the levelChars object that maps the plan characters to either background grid types or actor classes.
// has to be written after creating the classes

const levelChars = {
    ".": "empty",
    "#": "wall",
    "+": "lava",
    "@": Player,
    "o": Coin,
    "=": Lava,
    "|": Lava,
    "v": Lava
};


/// ----------- Function for Base Element Creation With Attributes -------- ///

// this function provides a short and precise way to create an element and give it some attributes
// and child nodes. It is going to be reused in the following functions afterwards every time new
// elements and attributes are needed.
// it also adds the children elements to their to the parent
// name => which html-element(e.g. Div, table...), attrs => classes or style-attributes for this element,
// ...children => div(game) => table(background) => tr(row) => td(block)

function elt(name, attrs, ...children) {
    let dom = document.createElement(name);
    for (let attr of Object.keys(attrs)) {
        dom.setAttribute(attr, attrs[attr]);
    }
    for (let child of children) {
        dom.appendChild(child); // append children to dom(the parent)
    }
    return dom;
}


/// ------------- Add and Draw Level --------- ///

// we define the display object to encapsule the drawing code.
// the DOMDisplay is called so because it uses DOM elements to show the level.
// A display is created by giving it a parent element to which it should append
// itself and a level object.
// draw grid has to be read in combination with the class DOMDisplay. they belong together. it is a big recursive line.
// the function could have also be written right inside the class
// it is a dynamic way to create the elements, classes and attributes of the background-grid, 
// which is divided like table-rows with table data. 
// by separation the code is more accessible and readable. because you can use the function for different classes if needed. 
// it creates the element, gives each of them an attribute, adds children of the element to the main element/parent before. and so on. 
// this.dom acts like a super div with all the information inside(from drawGrid) which
// each time is then added dynamically again to the body which is the master parent. 

class DOMDisplay {
    constructor(parent, level) {
        this.dom = elt("div", {class: "game"}, drawGrid(level));
        this.actorLayer = null; // follow actor element
        parent.appendChild(this.dom); // gameDiv append to html body        
    }
    clear() {
        this.dom.remove();
    }
}


/// ------------ Scaling Of Coordinates ----------- ///

// pixel scale
// scale constant gives the number of pixels that a single unit takes up on the screen.
// each char/actor has its position on the grid. It is the frame on which the vector object
// aligns the position for the moveable actors when it comes to use
// draw grid has to be read in combination with the class DOMDisplay. they belong together. it is a big recursive line.
// the function could have also be written right inside the class
// it is a dynamic way to create the elements, classes and attributes of the background-grid, which is divided like table-rows with table data. 
// by separation the code is more accessible and readable. because you can use the function for different classes if needed. 

const scale = 20;

function drawGrid(level) {
    return elt("table", {class: "background", style: `width: ${level.width * scale}px`}, 
    ...level.rows.map(row => elt("tr", {style: `height: ${scale}px`}, 
    ...row.map(type => elt("td", {class: type})))));
}


/// --------------- Drawing Of Single Actors With Scaling And Positioning --------- ///

// creating DOM-elements
// we use the elt function here again as recursive but only once. 
// we create one div without attributes but all the children from the parameter actors.
// its mapped to get every single "actor"-element which is then given an element again, an attribute, but this time no children.
// the size attributes are the size and position and scale. which have been set before 

function drawActors(actors) {
    // create a div with actor-divs inside, each gets size- and position-values inside their style-attributes
    return elt("div", {}, ...actors.map(actor => {
        let rect = elt("div", {class: `actor ${actor.type}`});
        rect.style.width = `${actor.size.x * scale}px`;
        rect.style.height = `${actor.size.y * scale}px`;
        rect.style.left = `${actor.pos.x * scale}px`;
        rect.style.top = `${actor.pos.y * scale}px`;
        return rect;
    }));
}


/// --------- Show Current Position of Actor and Redraw in New Position ------- ///

// we built different methods for the different classes. and add it to them with .prototype
// the created syncState method is used to make the display show a given state
// The actorLayer property will be used to track the element that holds the actors so that they
// can be easily removed and replaced
// this deletes the moving actor and redraws it with its new position again and
// and adds it to the main div(superDiv in this.dom) and gives it now the class: 'game playing'
// Since there will be only a few actors in the game, redrawing all of them is not so wasteful on the data-space
//* syncState is a property of DOMDisplay added to it with .prototype. it doesn't change and 
//* it is a function inside this property, it is used inside the async function runGame

DOMDisplay.prototype.syncState = function(state) {
    if (this.actorLayer) {
        this.actorLayer.remove();
    }
    this.actorLayer = drawActors(state.actors);
    this.dom.appendChild(this.actorLayer);
    this.dom.className = `game ${state.status}`;
    this.scrollPlayerIntoView(state);
};


/// ------ Detect Position of Actor to Set Position of Game Screen ------ ///

// we want the view point of the player to be frankly centered. 
// first to not be able to see the entire level, but also so 
// the game frame moves with the players movement.
// The way the player’s center is found shows how the methods on the Vec type
// allow calculation with objects to be written in a readable way.
// to add the actor's center, we add its position (top-left corner) and half its size.
// That is the center in level coordinates, but we need it in pixel coordinates, so
// we then multiply the resulting vector by our display scale.
//* this way we create a method "scrollPlayerIntoView" which is added to DOMDisplay with .prototype. as a property.
//* it is a function inside this property.
//* it is used in the syncState function

DOMDisplay.prototype.scrollPlayerIntoView = function(state) {
    let width = this.dom.clientWidth;
    let height = this.dom.clientHeight;
    let margin = width / 3;

    // Viewport
    let left = this.dom.scrollLeft,
        right = left + width;
    let top = this.dom.scrollTop,
        bottom = top + height;

    let player = state.player;
    let playerCenterVec = player.size.times(0.5);
    let playerNewPosVec = player.pos.plus(playerCenterVec)
    let center = playerNewPosVec.times(scale);

    // checks and verifies that the player position isn't outside of the allowed range
    // this could set scroll coordinates that are below zero or 
    // beyond the element’s scrollable area. Setting scrolLeft to negative numbers will 
    // cause it to become 0

    if (center.x < left + margin) {
        this.dom.scrollLeft = center.x - margin;
    } else if (center.x > right - margin) {
        this.dom.scrollLeft = center.x + margin - width;
    }
    if (center.y < top + margin) {
        this.dom.scrollTop = center.y - margin;
    } else if (center.y > bottom - margin) {
        this.dom.scrollTop = center.y + margin - height;
    }
};


/// ------------------ Movement ------------------ ///

// we will create conditions to be able to deal with the interactions between the elements.
// The game must notice when a given motion causes an object to hit another object and respond accordingly.

// here we are checking and giving conditions to make sure the player stays inside the game field 
// and doesn't fall outside of the frame.
// the created touches method for the level object (added to it with .prototype) 
// tells us whether a rectangle (specified by a position and a size) touches a grid element of the given type.
// it calculates the set of grid squares that the body overlaps with.( by using Math.ceil/floor)
// By rounding the sides of a box up and down, we get the range of background squares that the box touches.

Level.prototype.touches = function(pos, size, type) {
    var xStart = Math.floor(pos.x); // floor rounds down
    var xEnd = Math.ceil(pos.x + size.x); // ceil rounds up
    var yStart = Math.floor(pos.y);
    var yEnd = Math.ceil(pos.y + size.y);

    // we loop over the grid by rounding the coordinates and return true when the matching square is found
    // squares outside of the level are also treated as "wall" even they are actually "empty" to make sure
    // that the player can't leave the level world and won’t accidentally try to read outside of the bounds 
    // of our rows array.
    for (var y = yStart; y < yEnd; y++) {
        for (var x = xStart; x < xEnd; x++) {

            let isOutside = x < 0 || x >= this.width || y < 0 || y >= this.height;
            let here = isOutside ? "wall" : this.rows[y][x];

            if (here == type) {
                return true
            }
        }
    }
    return false
}


//* each actor has his individually created update method which is then added to the different objects with .prototype
// update method actualizes the data of the given object. //* see in comment list
// The actors also get the time step, the keys, and the state, so that they can base their update on those. 

State.prototype.update = function(time, keys) {

    // The first thing it does is call the update method on all actors, producing an array of updated actors.
    // only the player will actually read keys, since that’s the only actor that’s controlled
    // by the keyboard.
    
    let actors = this.actors.map(actor => actor.update(time, this, keys));

    // counts the coints inside the level and write this number inside the coinsSpan
    let coinFiltered = actors.filter(actor => actor.type == "coin");
    coinsSpan.innerText = scoreFormater(coinFiltered.length);
    
    let newState = new State(this.level, actors, this.status);

    // If the game is already over, no further processing has to be done, so it returns newState only as long the status is "playing"
    if (newState.status != "playing") {
        return newState;
    }
    // we create a new player with the actualized newState of the player
    let player = newState.player;

    // the method tests whether the player is touching background lava. if so the game is lost
    if (this.level.touches(player.pos, player.size, "lava")) {
        lavaSound.play();
        return new State(this.level, actors, "lost");
    }
    // if the game really is still going on, it sees whether any
    // other actors overlap the player. this is detected with the overlap function below
    for (let actor of actors) {
        if (actor != player && overlap(actor, player)) {
            newState = actor.collide(newState);
        }
    }
    return newState;
}

// Overlap between actors is detected with the overlap function. It takes two
// actor objects and returns true when they touch, which is the case when they
// overlap both along the x-axis and along the y-axis.

function overlap(actor1, actor2) {
    return actor1.pos.x + actor1.size.x > actor2.pos.x &&
        actor1.pos.x < actor2.pos.x + actor2.size.x &&
        actor1.pos.y + actor1.size.y > actor2.pos.y &&
        actor1.pos.y < actor2.pos.y + actor2.size.y;
}

// if the actors overlap the collide method updates the state.
// touching lava will change the status to "lost"

Lava.prototype.collide = function(state) {
    lavaSound.play();
    return new State(state.level, state.actors, "lost");
}


let scoreCounter = 0;
// if touching the coins they will vanish 
Coin.prototype.collide = function(state) {
    // restarts the sound, it's needed if you collect more than one coin in a short time and the sound didn't finished yet
    coinSound.currentTime = 0;
    coinSound.play();

    let filtered = state.actors.filter(a => a != this);
    scoreSpan.innerText = scoreFormater(scoreCounter += 100);

    let status = state.status;
    // if touching the last coins the status is changed to "won"
    // if there is no actor "coin" found with .some then the game is won
    // the ! switches true to false .. so it shows me true when there are no more coins in the filtered array
    if (!filtered.some(a => a.type == "coin")) {
        status = "won";
        levelCompleteSound.play();
    }
    return new State(state.level, filtered, status);
}


/// ---------------- Actor updates ------------- ///

// the objects’ update methods for the actors, take as arguments the time step, the state object,
// and a keys object. The one for the Lava actor type ignores the keys object.
// This update method calculates a new position by adding the product of the
// time step and the current speed to its old position

// If no obstacle blocks that new position, it moves there. If there is an obstacle the behavior depends on the type
// Bouncing lava inverts its speed by multiplying it by -1 so that it starts moving in the opposite direction.

Lava.prototype.update = function(time, state) {

    let posVec = this.pos;
    let speedVec = this.speed.times(time); 
    let newPos = posVec.plus(speedVec);

    if (!state.level.touches(newPos, this.size, "wall")) { // ? if lava doesn't touch wall
        return new Lava(newPos, this.speed, this.reset);
    } else if (this.reset) { // ? if lava touches the wall and has a reset-value
        return new Lava(this.reset, this.speed, this.reset);
    } else { // ? if lava touches the wall and hasn't a reset-value
        return new Lava(this.pos, this.speed.times(-1));
    }
}

// The wobble property is incremented to track time and then used as an argument to Math.sin 
// to find the new position on the wave. The coin’s current
// position is then calculated from its base position and an offset based on this wave.

const wobbleSpeed = 8,
    wobbleDist = 0.07;

Coin.prototype.update = function (time) {
    let wobble = this.wobble + time * wobbleSpeed;
    let wobblePos = Math.sin(wobble) * wobbleDist;

    return new Coin(this.basePos.plus(new Vec(0, wobblePos)), this.basePos, wobble);
}


// Player motion is handled separately per axis
// because hitting the floor should not prevent horizontal motion, and hitting a
// wall should not stop falling or jumping motion.
// The horizontal motion is computed based on the state of the left and right arrow keys.
// When there’s no wall blocking the new position created by this
// motion, it is used. Otherwise, the old position is kept.
// Vertical motion works similar but has to simulate jumping and gravity.
// The player’s vertical speed ( ySpeed ) is first anticipated to account for gravity

const playerXSpeed = 7;
const gravity = 30;
const jumpSpeed = 17;

Player.prototype.update = function (time, state, keys) {
    let xSpeed = 0;

    if (keys.ArrowLeft) {
        xSpeed -= playerXSpeed;
    }
    if (keys.ArrowRight) {
        xSpeed += playerXSpeed;
    }
    let pos = this.pos;
    let newXVec = new Vec(xSpeed * time, 0);
    let movedX = pos.plus(newXVec);
    
    if (!state.level.touches(movedX, this.size, "wall")) {
        pos = movedX;
    }
    let ySpeed = this.speed.y + time * gravity;
    let newYVec = new Vec(0, ySpeed * time);
    let movedY = pos.plus(newYVec);

    if (!state.level.touches(movedY, this.size, "wall")) {
        pos = movedY;
    } else if (keys.ArrowUp && ySpeed > 0) {  //* to see and be able to jump again if the "head" hits the wall(ceiling) or touches the floor (also wall)
    ySpeed = -jumpSpeed;
    } else {
        ySpeed = 0;
    }
    return new Player(pos, new Vec(xSpeed, ySpeed));
}


/// ------------------ Tracking Keys ----------------- ///

function trackKeys(keys) {
    let down = Object.create(null);
    
    function track(event) {
        if (keys.includes(event.key)) {
            down[event.key] = event.type == "keydown";
            event.preventDefault();
        }
    }
    window.addEventListener("keydown", track);
    window.addEventListener("keyup", track);

    return down;
}
const arrowKeys = trackKeys(["ArrowLeft", "ArrowRight", "ArrowUp"])


function runAnimation(frameFunc) {
    let lastTime = null;

    function frame(time) {
        if (lastTime != null) {
            let timeStep = Math.min(time - lastTime, 100) / 1000;  // ms / 1000 => seconds
            if (frameFunc(timeStep) === false) {
                return;
            }
        }
        lastTime = time;
        requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);
}

// switch for gameBlocker, prevents start of a new gameDisplay if playButton is 
// clicked repeatedly while game is already running
let switcher = true;

function runLevel(level, Display){
    let display = new Display(document.body, level);
    let state = State.start(level);
    let ending = 1;

    return new Promise(resolve =>{
        runAnimation(time =>{
            state = state.update(time, arrowKeys);
            display.syncState(state);

            if(state.status == "playing"){
                switcher = false; // switcher to false -> no new game created when clicking playButton
                return true;
            } else if (ending > 0){
                ending -= time;
                return true;
            } else {
                display.clear();
                resolve(state.status);
                return false;
            }
        })
    })
}

async function runGame(plans, Display){
    let lives = 1;
    for(let level = 0; level < plans.length && lives > 0;){
        levelSpan.innerText = level + 1;
        livesSpan.innerText = lives;
        let status = await runLevel(new Level(plans[level]), Display);
        if(status == "won"){
            level++;
        } else {
            lives--;
        }
    }
    if (lives > 0) {
        switcher = true; // switcher to true -> so game appears again after you've won and press playButton again
        coinSound.play();
        message.innerText = "You've Won!";
        createHiScoreList();
    } else {
        switcher = true; // switcher to true -> so game appears again after you lost and press playButton again
        gameOverSound.play();
        message.innerText = "Game Over";
        livesSpan.innerText = lives;
        createHiScoreList();

    }
}


/// ----------- HighScoreList ----------- ///

let hiScoreArr = [];

function createHiScoreList() {
    // load items from storage
    let storageData = localStorage.getItem('hiScore');
    // stored playerData pushed into array
    if (storageData) {
        let dataObj = JSON.parse(storageData);
        hiScoreArr = [];
        dataObj.forEach(player => {
            hiScoreArr.push(player);
        })
    }
    // create new playerData-object and push it into array
    let playerName = playerNameInput.value.trim();
    if (playerName !== '') {
        playerNameInput.value = '';
        let hiScoreObj = {};
        hiScoreObj.name = playerName;
        hiScoreObj.score = scoreCounter;
        hiScoreArr.push(hiScoreObj);
        // scoreCounter = 0; // resets the scoreCounter for the next player
        // scoreSpan.innerText = scoreCounter;
        // create highScoreList as DOM-elements
        hiScoreArr.forEach(player => {
            let listItem = document.createElement('li');
            listItem.innerText = player.name + ': ' + player.score + ' Points';
            highScoreList.append(listItem);
        })
        // save new array to localStorage
        localStorage.setItem('hiScore', JSON.stringify(hiScoreArr));
    }
}

/// ----------- Score Formating ----------- ///

function scoreFormater(score) {
    let result = ''
    if (score >= 1000 && score < 10000) { // for scores with 4 digits -> 1000 -> 01000
        result = '0' + score.toString();
    } else if (score >= 100 && score < 1000) { // for scores with 3 digits -> 100 -> 00100
        result = '00' + score.toString();
    } else if (score < 10) { // for coin-scores with 1 digit -> 7 -> 07
        result = '0' + score.toString();
    } else {
        result = score.toString();
    }
    return result;
}
