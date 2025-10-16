// Canvas and game states setup
const canvas = document.querySelector('#gameCanvas');
const ctx = canvas.getContext('2d');
const GAME_STATE = { START: 0, RUNNING: 1, OVER: 2 };
let state = GAME_STATE.START;

// Game constants
const PLAYER = { WIDTH: 24, HEIGHT: 18, SPEED: 2 };
const BULLET = { WIDTH: 2, HEIGHT: 10, SPEED: 2 };
const INVADER = { WIDTH: 24, HEIGHT: 18, SPEED: 4 };
const SPACESHIP = { WIDTH: 32, HEIGHT: 16, SPEED: 1, 
                    CELLX: 0, CELLY: 0, OFFSETX: 0, OFFSETY: 114 };

const COLORS = ["#F00", "#0F0", "#00F", "#FF0", "#F0F"];

// starting cell y frame row of each invader row sprite in sprite sheet
const INVADER_TYPE_START_FRAME = [1,4,2,3,0];

const INVADERS_OFFSET_Y = 128;
const INVADERS_OFFSET_X = 144;
const INVADERS_SPACING_X = 32;
const INVADERS_SPACING_Y = 32;
const INVADER_DEATH_LINE = canvas.height - INVADER.HEIGHT * 5;

// size of each destructble block in barrier
const BARRIER_BLOCK_WIDTH = 5;
const BARRIER_BLOCK_HEIGHT = 5;

// number of blocks that make up destructable barrier (width x height)
const BARRIER_WIDTH = 12; 
const BARRIER_HEIGHT = 12;
const BARRIER_START_HEIGHT  = 350; 
const BARRIER_START_XOFFSET = -10; 

// colors to add a bit of detail with encoding
const barrierColors = ["#000000", "#64B0F6", "#00FF00"]

// encode a crude 12x12 shape map, using bits would be more efficient of course
const barrierShape = 
    [ 
    0,0,0,2,2,2,2,2,2,0,0,0, 
    0,0,2,1,1,1,1,1,1,2,0,0, 
    0,2,1,1,1,1,1,1,1,1,2,0, 
    2,1,1,1,1,1,1,1,1,1,1,2, 
    2,1,1,1,1,1,1,1,1,1,1,2, 
    2,1,1,1,1,1,1,1,1,1,1,2, 
    2,1,1,1,1,1,1,1,1,1,1,2, 
    2,1,1,1,1,1,1,1,1,1,1,2, 
    2,1,1,1,1,1,1,1,1,1,1,2, 
    2,1,1,1,2,2,2,2,1,1,1,2, 
    2,1,1,2,0,0,0,0,2,1,1,2, 
    2,2,2,0,0,0,0,0,0,2,2,2, 
    ];

// Game variables
let player;
let invaders = [];
let spaceship;
let playerBullet;
let scoreBillboard = null;
let invaderBullet;
let barriers = []
let highScore = 10000;
let wave = 1;
let score = 0;
let health = 5;
let shipsLeft = 3;
let frameCounter = 0;

// Key presses and listeners
let keys = [];
window.addEventListener('keydown', function (e) { keys[e.keyCode] = true; });
window.addEventListener('keyup', function (e) { keys[e.keyCode] = false; });

// Start button
document.querySelector('#startButton').addEventListener('click', () => {
  if (state !== GAME_STATE.RUNNING) {
    startGame();
  }
});

// background image(s)
var backgroundImage = new Image();
backgroundImage.src = "./images/invaders_background_03.png";

var invaderSpriteSheet = new Image();
invaderSpriteSheet.src = "./images/invaders_04.png";

var invadersLogoImage = new Image();
invadersLogoImage.src = "./images/invaders_logo_01.png";

// sound and music
// player missiles, 4 slots should do
var laserBlastSound = [ new Audio(), new Audio(), new Audio(), new Audio()];
laserBlastSound[ 0 ].src = "./sounds/LaserBlast01.wav";
laserBlastSound[ 1 ].src = "./sounds/LaserBlast01.wav";
laserBlastSound[ 2 ].src = "./sounds/LaserBlast01.wav";
laserBlastSound[ 3 ].src = "./sounds/LaserBlast01.wav";

var spaceShipSound = new Audio();
spaceShipSound.src = "./sounds/spaceship01.wav";

// invader death sound, 2 slots should do
var invaderDeathSound = [ new Audio(), new Audio ];
invaderDeathSound[ 0 ].src = "./sounds/DeathSound01.wav";
invaderDeathSound[ 1 ].src = "./sounds/DeathSound01.wav";

// ufo space ship
var spaceShipDeathSound = new Audio();
spaceShipDeathSound.src = "./sounds/EXP3.WAV";

// invaders walk march sound
var invaderMarchSound = new Audio();
invaderMarchSound.src = "./sounds/invaderWalk04.wav";

// game over sound
var gameOverSound = new Audio();
gameOverSound.src = "./sounds/GAMEOVER.WAV";

//////////////////////////////////////////////////////////////////////////////

function DrawBitmapFromSpriteSheet2(cellX, cellY,
                                    borderWidth,
                                    spriteWidth, spriteHeight,
                                    spriteImageSheet, 
                                    x, y, 
                                    originX = 0, originY=0) {
    // version 2.0 - added absolute origin to support starting (0,0) origin at 
    // arbitrary (x,y) in sprite sheet
    // draw an image to the canvas from the sprite sheet
    // drawImage(image, sx, sy, sWidth, sHeight, dx, dy, dWidth, dHeight)
    var offsetX = originX + (cellX + 1) * borderWidth + cellX * spriteWidth;
    var offsetY = originY + (cellY + 1) * borderWidth + cellY * spriteHeight;

    ctx.drawImage(spriteImageSheet,
        offsetX, offsetY,
        spriteWidth, spriteHeight,
        Math.floor(x + 0.5), Math.floor(y + 0.5),
        spriteWidth, spriteHeight);

} // end DrawBitmapFromSpriteSheet2

//////////////////////////////////////////////////////////////////////////////

function startGame() 
{
  state = GAME_STATE.RUNNING;

  // create player object
  player = { x: canvas.width / 2, y: canvas.height - 30, width: PLAYER.WIDTH, height: PLAYER.HEIGHT, color: "#0F0", dx: PLAYER.SPEED };

  // create explosions
  explosions = [];
    
  // build up invaders  
  invaders = [];
  for (let i = 0; i < 5; i++) {
    for (let j = 0; j < 11; j++) {
      invaders.push({
        x: INVADERS_OFFSET_X + j * INVADERS_SPACING_X,
        y: INVADERS_OFFSET_Y + i * INVADERS_SPACING_Y,
        width: INVADER.WIDTH,
        height: INVADER.HEIGHT,
        color: COLORS[i],
        dx: INVADER.SPEED,
        // new fields to support animation and bitmaps
        startFrame: INVADER_TYPE_START_FRAME[ i ],
        currFrame: 0,
        animCount: 0,
        animCountMax: 32 - (wave*2) % 24,
        row: i, // initial row of invader
        col: j, // initial column of invader
      });
    }
  }

  // create barriers
  barriers = [];
  for (let i = 0; i < 4; i++) {
    for (let j = 0; j < BARRIER_WIDTH; j++) {
      for (let k = 0; k < BARRIER_HEIGHT; k++) {

        // interogate the barrier shape and only add barrier blocks that the shape has
        // non-zero bits in
        if ( barrierShape[ k * BARRIER_WIDTH + j ] )
        {  
        barriers.push({
          x: BARRIER_START_XOFFSET + (i + 1) * 120 + j * BARRIER_BLOCK_WIDTH,
          y: BARRIER_START_HEIGHT + k * BARRIER_BLOCK_HEIGHT, 
          width: BARRIER_BLOCK_WIDTH,
          height: BARRIER_BLOCK_HEIGHT,
          color:  barrierColors[ barrierShape[ k * BARRIER_WIDTH + j ] ]       //"#64B0F6"// "#55929B" // "#9AD941"
        });
        } // end if 
          
      }
    }
  }
    
  // reset game state vars
  playerBullet = null;
  invaderBullet = null;
  spaceship = null;
  wave = 1;
  score = 0;
  health = 5;
  shipsLeft = 3;
  frameCounter = 0;
  invadersDeathCount = 0;
  gameStateCounter = 0;
    
  // start the march
  invaderMarchSound.volume = 0.4;
  invaderMarchSound.loop = true;
  invaderMarchSound.playbackRate = 1;
  invaderMarchSound.currentTime = 0;
  invaderMarchSound.play();
    
} // end startGame

///////////////////////////////////////////////////////////////////////////////

// tracks how many invaders player has killed, when count == number of invaders, level is complete
var invadersDeathCount = 0;
var gameStateCounter = 0;

function startNextWave()
{
// this function is called when a "wave" ends and resets state variables, rebuilds
// invaders, etc. 

  state = GAME_STATE.RUNNING;
    
  // build up invaders for new wave
  invaders = [];
  for (let i = 0; i < 5; i++) {
    for (let j = 0; j < 11; j++) {
      invaders.push({
        x: INVADERS_OFFSET_X + j * INVADERS_SPACING_X,
        y: ((wave - 1) * 8) + INVADERS_OFFSET_Y + i * INVADERS_SPACING_Y,
        width: INVADER.WIDTH,
        height: INVADER.HEIGHT,
        color: COLORS[i],
        dx: INVADER.SPEED,

        // new fields to support animation and bitmaps
        startFrame: INVADER_TYPE_START_FRAME[ i ],
        currFrame: 0,
        animCount: 0,
        animCountMax: 32 - (wave*2) % 24,
        row: i, // initial row of invader
        col: j, // initial column of invader
      });
    }
  }
    
  // reset game state vars
  playerBullet = null;
  invaderBullet = null;
  //spaceship = null;
  wave++;
  //health = 5;
  frameCounter = 0;

  invadersDeathCount = 0;
  gameStateCounter = 0;
    
  // start the march sound
  invaderMarchSound.volume = 0.4;
  invaderMarchSound.loop = true;
  invaderMarchSound.playbackRate = 1;
  invaderMarchSound.currentTime = 0;
  invaderMarchSound.play();
    
} // end startNextWave

///////////////////////////////////////////////////////////////////////////////

// Collision detection
function collide(a, b) {
  return a.x < b.x + b.width && a.x + a.width > b.x && a.y < b.y + b.height && a.y + a.height > b.y;
} // end collide

///////////////////////////////////////////////////////////////////////////////

// Update game state
function update() {

  // flag to reverse swarm
  let reverseInvaders = false;

  // state logic for when game is running
  if (state === GAME_STATE.RUNNING) {
    
    // Player movement
    if (keys[37]) player.x -= player.dx; // Left arrow
    if (keys[39]) player.x += player.dx; // Right arrow

    // test for bounds
    if ( player.x + 4 * player.width > canvas.width)
        player.x -= player.dx;
    else      
    if ( player.x < player.width * (4-1) )
        player.x += player.dx;
      
    // Player shooting
    if (keys[32] && !playerBullet) { // Spacebar
      playerBullet = { x: player.x + player.width/2 - 1, y: player.y, width: BULLET.WIDTH, height: BULLET.HEIGHT, color: "#0F0", dy: -5 };

      // play laser blast sound, scan for available sound
        for (var sound of laserBlastSound) {
            if (sound.ended || sound.currentTime == 0) {
                sound.volume = 0.5;
                sound.play();
                break;
            } // end if
        } // end for
       
    } // end if fire
      
    // Player bullet movement
    if (playerBullet) {
      playerBullet.y += playerBullet.dy;
    
      if (playerBullet.y + playerBullet.height < 0) 
          playerBullet = null;
    }
    
    // Invader movement and shooting
    invaders.forEach(invader => {

        // update animation frame and position discretly, so invader pauses each step
        invader.animCount++;
        
        if ( invader.animCount >= invader.animCountMax )
            {          
            // reset counter
            invader.animCount = 0;
            
            // update frame
            if ( ++invader.currFrame >= 2) 
                invader.currFrame = 0;
    
            // now move invader a step
            invader.x += invader.dx;
                
            } // end if

      // can invader fire a bullet  
      if (!invaderBullet && Math.random() < (0.001 * wave)) {
        invaderBullet = { x: invader.x + invader.width/2 - 1, 
                          y: invader.y, 
                          width: BULLET.WIDTH, height: BULLET.HEIGHT, 
                          color: "#F00", dy: BULLET.SPEED + (wave - 1) };
      }

      // has invader right/left hit bounds? If so, reverse the entire swarm
      if ( invader.x < (INVADER.WIDTH * 3) || invader.x + invader.width > ( canvas.width - (INVADER.WIDTH * 3)) ) {
          reverseInvaders = true;              
      } // end if

      // check if invaders below "death line"
      if (invader.y > INVADER_DEATH_LINE ) 
          {
          state = GAME_STATE.OVER;

          spaceShipSound.pause();    
          invaderMarchSound.pause();  

          // create a new explosion object and push it into array
          explosions.push(
              {
              x: player.x,        // x position of explosion
              y: player.y,        // y position of explosion
              currFrame: 0,        // current frame of explosion
              numFrames: 3,        // number of frames for explosion
              animCount: 0,         // counts the frames until the next frame is shown
              animCountMax: 8,     // threshold to advance to next frame 
              });

          // play explosion and game over sound    
          spaceShipDeathSound.play();
          
          // play game over sound
          gameOverSound.play();    
          } // end if
        
    }); // end for each
      
    // Invader bullet movement
    if (invaderBullet) {
      invaderBullet.y += invaderBullet.dy;
        
      if (invaderBullet.y > canvas.height) 
          invaderBullet = null;
    }

    // test for spaceship
    if ( spaceship )
    {
    // Spaceship movement
    spaceship.x += spaceship.dx;

    // out of bounds
    if (spaceship.x < -SPACESHIP.WIDTH || spaceship.x > canvas.width) 
        {
        spaceship = null;    

        // stop ship sound
        spaceShipSound.pause();
        
        } // end if

    // bullet hit test, make sure spaceship is still valid
    if ( spaceship )
        {
        if (playerBullet && collide(playerBullet, spaceship)) 
          {
          playerBullet = null;

          // create a new explosion object and push it into array
          explosions.push(
              {
              x: spaceship.x,      // x position of explosion
              y: spaceship.y,      // y position of explosion
              currFrame: 0,        // current frame of explosion
              numFrames: 3,        // number of frames for explosion
              animCount: 0,        // counts the frames until the next frame is shown
              animCountMax: 6,     // threshold to advance to next frame 
              });

              
           let bonus = 100 * wave + 50 * Math.floor( Math.random()*4) ;;
          // create a score billboard to show awesome shot   
          scoreBillboard = {x: spaceship.x - 16,
                            y: spaceship.y - 0,
                            text: bonus + " pts",
                            color:  "#F8F7CB",
                            frameCounter: 60 }
              
           score += bonus;
           spaceship = null;
              
          // play explosion sounds
          invaderDeathSound[0].currentTime = 0;
          invaderDeathSound[0].play();
          spaceShipDeathSound.play();
    
          // stop ship sound
          spaceShipSound.pause();
    
          } // end if 
        } // end if
            
    } // end if spaceship
    else
    {
    // try and spawn spaceship, probability of 0.05%/frame * wave
    if (Math.random() < (0.001 * wave) )
        {
            
        // send ship right or left 50-50
        if ( Math.random() < 0.5 )
            {            
            spaceship = { x: -SPACESHIP.WIDTH, y: 50 + Math.floor( Math.random()*50), 
                        width: SPACESHIP.WIDTH, height: SPACESHIP.HEIGHT, 
                        color: "#F0F", 
                        dx: SPACESHIP.SPEED * (1 + Math.floor( Math.random() * wave)),
                        frame: 0 };
            } // end if
        else
            {
            spaceship = { x: canvas.width, y: 50  + Math.floor( Math.random()*50), 
                        width: SPACESHIP.WIDTH, height: SPACESHIP.HEIGHT, 
                        color: "#F0F", 
                        dx: -SPACESHIP.SPEED * (1 + Math.floor( Math.random() * wave)),
                        frame: 0 };
                
            } // end else
            
          // play sound
          spaceShipSound.volume = 0.5;
          spaceShipSound.currentTime = 0;
          spaceShipSound.play();
          spaceShipSound.loop = true;
            
          } // end if
        
     } // end else

      
    // Collision detection
    barriers.forEach((barrier, index) => {
      if (playerBullet && collide(playerBullet, barrier)) {

        explosions.push(
          {
          x: playerBullet.x - INVADER.WIDTH/2,      // x position of explosion
          y: playerBullet.y,                        // y position of explosion
          currFrame: 0,        // current frame of explosion
          numFrames: 2,        // number of frames for explosion
          animCount: 0,        // counts the frames until the next frame is shown
          animCountMax: 2,     // threshold to advance to next frame 
          });
          
        playerBullet = null;
        barriers.splice(index, 1);
      }
        
      if (invaderBullet && collide(invaderBullet, barrier)) {

        explosions.push(
          {
          x: invaderBullet.x - INVADER.WIDTH/2,      // x position of explosion
          y: invaderBullet.y,      // y position of explosion
          currFrame: 0,        // current frame of explosion
          numFrames: 3,        // number of frames for explosion
          animCount: 0,        // counts the frames until the next frame is shown
          animCountMax: 2,     // threshold to advance to next frame 
          });

        invaderBullet = null;
        barriers.splice(index, 1);
      }
    }); // end for each
      
    //invaders = invaders.filter(invader => !playerBullet || !collide(playerBullet, invader));

    // use "every" to iterate, so we can "break" out of loop with return(false)
    invaders.every( (invader, index ) => {
        // check if player's bullet hit this invader
        if (playerBullet && collide( playerBullet, invader ))
            {
            // remove invader, kill bullet, break out of loop
            playerBullet = null;

           // play invader death sound, scan for available sound
            for (var sound of invaderDeathSound) {
                if (sound.ended || sound.currentTime == 0) {
                    sound.volume = 0.7;
                    sound.play();
                    break;
                } // end if
            } // end for
                
            // add to score, take into consideration level, row of alien,
            // and number of aliens left in level...
            score += (5 - invader.row) * 10;

            // start an explosion at this location
            
          // create a new explosion object and push it into array
          explosions.push(
              {
              x: invader.x,        // x position of explosion
              y: invader.y,        // y position of explosion
              currFrame: 0,        // current frame of explosion
              numFrames: 3,        // number of frames for explosion
              animCount: 0,         // counts the frames until the next frame is shown
              animCountMax: 6,     // threshold to advance to next frame 
              });
                
            // remove invader from list                
            invaders.splice(index, 1);

            // increment number of kills
            ++invadersDeathCount;
                
            return( false );
            } // end if
        return( true );
    } );

    // check if player has been hit by invader bullet  
    if (invaderBullet && collide(invaderBullet, player)) {
      state = GAME_STATE.OVER;

      // stop all sounds
      spaceShipSound.pause();
      invaderMarchSound.pause();  

      // create a new explosion object and push it into array
      explosions.push(
          {
          x: player.x,        // x position of explosion
          y: player.y,        // y position of explosion
          currFrame: 0,        // current frame of explosion
          numFrames: 3,        // number of frames for explosion
          animCount: 0,         // counts the frames until the next frame is shown
          animCountMax: 8,     // threshold to advance to next frame 
          });

      // play explosion and game over sound    
      spaceShipDeathSound.play();
      
      // play game over sound
      gameOverSound.play();    
        
    } // end if

// test if swarm needs to reverse
if ( reverseInvaders )
    {
    invaders.forEach(invader => {
        invader.dx = -invader.dx;
        invader.x += invader.dx;          
        invader.y += invader.height;
        invader.animCount = 0;
  
        if ( (invader.animCountMax -= 4) <= 0 )
            invader.animCountMax = 2;
        } );

    // speed up march
    invaderMarchSound.playbackRate += 0.32;
    
    } // end if

 // test if level is complete
 if ( invadersDeathCount >= (5*11) )
    {
    // pause march
    invaderMarchSound.pause();
        
    // start counting frame to delay new wave
    if (++gameStateCounter > 180 )
        {
        // call for new wave
        startNextWave();
        } // end if
     
    } // end if
      
  } // end if running
    
} // end update

///////////////////////////////////////////////////////////////////////////////

// Draw game state
function draw() {

  if (state == GAME_STATE.START)
    {
    ctx.drawImage( backgroundImage, 0, 0 );
    ctx.drawImage( invadersLogoImage, 
                   canvas.width/2 - 0.9*invadersLogoImage.width/2,
                   4);    

     ctx.font = '20px fantasy';
     ctx.fillStyle = "#F4FFBF";
     ctx.fillText("=   50 PTS", canvas.width / 2 + 0, canvas.height/2 + 0) ;
     ctx.fillText("=   40 PTS", canvas.width / 2 + 0, canvas.height/2 + 25) ;
     ctx.fillText("=   30 PTS", canvas.width / 2 + 0, canvas.height/2 + 50) ;
     ctx.fillText("=   20 PTS", canvas.width / 2 + 0, canvas.height/2 + 75) ;
     ctx.fillText("=   10 PTS", canvas.width / 2 + 0, canvas.height/2 + 100) ;
      
     ctx.fillStyle = "#608057";
     ctx.fillText("=   ??? PTS", canvas.width / 2 + 0, canvas.height/2 + 125) ;

     DrawBitmapFromSpriteSheet2(0,1,1,INVADER.WIDTH, INVADER.HEIGHT, invaderSpriteSheet, canvas.width/2 - 40, canvas.height/2 + 0 - 16 );  
     DrawBitmapFromSpriteSheet2(0,4,1,INVADER.WIDTH, INVADER.HEIGHT, invaderSpriteSheet, canvas.width/2 - 40, canvas.height/2 + 25  - 16 );
     DrawBitmapFromSpriteSheet2(0,2,1,INVADER.WIDTH, INVADER.HEIGHT, invaderSpriteSheet, canvas.width/2 - 40, canvas.height/2 + 50  - 16 );
     DrawBitmapFromSpriteSheet2(0,3,1,INVADER.WIDTH, INVADER.HEIGHT, invaderSpriteSheet, canvas.width/2 - 40, canvas.height/2 + 75  - 16 );
     DrawBitmapFromSpriteSheet2(0,0,1,INVADER.WIDTH, INVADER.HEIGHT, invaderSpriteSheet, canvas.width/2 - 40, canvas.height/2 + 100 - 16 );
     DrawBitmapFromSpriteSheet2(0,0,1,SPACESHIP.WIDTH, SPACESHIP.HEIGHT, invaderSpriteSheet, canvas.width/2 - 40, canvas.height/2 + 125  - 16, SPACESHIP.OFFSETX, SPACESHIP.OFFSETY );
        
    } // end if

    
  if (state === GAME_STATE.RUNNING || state === GAME_STATE.OVER) {
    // Clear screen
    //ctx.fillStyle = 'black';
    //ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage( backgroundImage, 0, 0 );
      
      // Draw player
    //ctx.fillStyle = player.color;
    //ctx.fillRect(player.x, player.y, player.width, player.height);

    DrawBitmapFromSpriteSheet2(3, 5,
                               1,
                               24,18,
                               invaderSpriteSheet,                                    
                               player.x, player.y );
      
    // Draw invaders
    invaders.forEach(invader => {
      //ctx.fillStyle = invader.color;
      //ctx.fillRect(invader.x, invader.y, invader.width, invader.height);
      // draw the current invader bitmap, each row in sprite sheet is different
      // type, each column (2 of them) is animation frame

        DrawBitmapFromSpriteSheet2(invader.currFrame, invader.startFrame, 1,
                                 invader.width, invader.height,
                                 invaderSpriteSheet, 
                                 invader.x, invader.y);
    });
    
    // Draw spaceship
    //ctx.fillStyle = spaceship.color;
    //ctx.fillRect(spaceship.x, spaceship.y, spaceship.width, spaceship.height);

    if ( spaceship )
    {
    spaceship.frame = Math.floor( frameCounter / 10 ) % 4;
      
    DrawBitmapFromSpriteSheet2(SPACESHIP.CELLX + spaceship.frame,SPACESHIP.CELLY + 0, 1,
                               spaceship.width, spaceship.height,
                               invaderSpriteSheet,
                               spaceship.x, spaceship.y,
                               SPACESHIP.OFFSETX, SPACESHIP.OFFSETY ); 
    } // end if
      
    // draw score billboard 
    if ( scoreBillboard )
        {
        // Draw score
        ctx.fillStyle = "#F8F7CB";
        ctx.font = "20px fantasy";
        ctx.fillText(scoreBillboard.text, scoreBillboard.x, scoreBillboard.y);

        // move display up and away
        scoreBillboard.y++;
            
        // update counter to remove billboard
        if ( --scoreBillboard.frameCounter <= 0 )
            scoreBillboard = null;
        } // end if

      
    // Draw barriers
    barriers.forEach(barrier => {
      ctx.fillStyle = barrier.color;
      ctx.fillRect(barrier.x, barrier.y, barrier.width, barrier.height);
    });
      
    // Draw bullets
    if (playerBullet) {
      ctx.fillStyle = playerBullet.color;
      ctx.fillRect(playerBullet.x, playerBullet.y, playerBullet.width, playerBullet.height);
    }

    // draw invader bullet with bitmaps, use frameCounter to animate, keep it simple
    if (invaderBullet) {
      //ctx.fillStyle = invaderBullet.color;
      //ctx.fillRect(invaderBullet.x, invaderBullet.y, invaderBullet.width, invaderBullet.height);
    
    DrawBitmapFromSpriteSheet2(2,
                               0 + Math.floor( frameCounter / 4) % 4, 
                               1,
                               INVADER.WIDTH, INVADER.HEIGHT,
                               invaderSpriteSheet,
                               invaderBullet.x - INVADER.WIDTH/2, invaderBullet.y,
                               0,0 ); 

        
    }

  // animate all the explosions
    explosions.forEach( ( explosion, index ) => {

        // update animation frame and position discretly, so invader pauses each step
        explosion.animCount++;
        
        if ( explosion.animCount >= explosion.animCountMax )
            {          
            // reset counter
            explosion.animCount = 0;
            
            // update frame
            if ( ++explosion.currFrame >= explosion.numFrames) 
                {
                // terminate the explosion, remove it from list
                explosions.splice(index,1);
                } // end if
      
            } // end if
        
    } ); // end each explosion
      
    // draw all the explosions
    explosions.forEach( ( explosion, index ) => {

        DrawBitmapFromSpriteSheet2(3, explosion.currFrame, 1,
                                 INVADER.WIDTH, INVADER.HEIGHT,
                                 invaderSpriteSheet, 
                                 explosion.x, explosion.y);
            
    } ); // end each explosion
      
    // Draw high score
    ctx.fillStyle = "#F8F7CB";
    ctx.font = "9px fantasy";
    ctx.fillText(highScore, 404, 21);
      
    // Draw score
    ctx.fillStyle = "#F8F7CB";
    ctx.font = "9px fantasy";
    ctx.fillText(score, 404, 21 + 9);

    // Draw wave
    ctx.fillStyle = "#F8F7CB";
    ctx.font = "9px fantasy";
    ctx.fillText(wave, 404, 21 + 18);

    // draw level over
    if ( invadersDeathCount >= (5*11) )      
       {
       ctx.fillStyle = "#F8F7CB";
       ctx.font = "24px fantasy";
       ctx.fillText("LEVEL COMPLETE!", canvas.width/2 - 3*24 , canvas.height/2 - 64);
       } // end if
      
    // draw ships left
    for (var ship = 0; ship < shipsLeft; ship++ )
        {
        DrawBitmapFromSpriteSheet2(2,5,1, 
                               PLAYER.WIDTH, PLAYER.HEIGHT,
                               invaderSpriteSheet,260 + ship * 14 ,22 );
        } // end for ship
      
    // Draw game over screen
    if (state === GAME_STATE.OVER) {
      ctx.fillStyle = 'white';
      ctx.font = '32px fantasy';
      ctx.fillText("GAME OVER", canvas.width / 2 - 60, 96 );
      ctx.font = '16px fantasy';
      ctx.fillText("PRESS START TO PLAY AGAIN", canvas.width / 2 - 80, 116) ;
    }
  }
} // end draw

///////////////////////////////////////////////////////////////////////////////

// Game loop
function loop() {
  update();
  draw();
  frameCounter++;
  
  requestAnimationFrame(loop);
} // end loop

///////////////////////////////////////////////////////////////////////////////

// call loop to kick things off
loop();
