let CANVAS_W, CANVAS_H;

let player;
let cameraX = 0;
let cameraY = 0;
let keys = {};
let entities = [];
let particles = [];
let platforms = [];

let imgBg1, imgBg2, imgPlayer, imgEnemy, imgWalk, imgSheathe, imgWalkUnarmed, imgEnemyWalk, imgEnemyShoot, imgPlayerDeath;

// Colors - Slayen Aesthetic
const COLOR_SHADOW = '#050010';
const COLOR_PURPLE = '#3c006b';
const COLOR_NEON = '#d000ff';
const COLOR_METALLIC = '#454b54';
const COLOR_GROUND = '#1a1025';

function preload() {
  imgBg1 = loadImage('assets/distant_mountains_1777544572921.png');
  imgBg2 = loadImage('assets/industrial_ruins_1777544877323.png');
  imgPlayer = loadImage('assets/player_sprite_1777544899780.png');
  imgEnemy = loadImage('assets/enemy_sprite_1777544917977.png');
  imgWalk = loadImage('assets/WalkingRight.png');
  imgSheathe = loadImage('assets/SheatheWeapon.png');
  imgWalkUnarmed = loadImage('assets/WalkingRightGunSheathed.png');
  imgEnemyWalk = loadImage('assets/EnemyWalkingRight.png');
  imgEnemyShoot = loadImage('assets/EnemyShooting.png');
  imgPlayerDeath = loadImage('assets/PlayerDies.png');
}

function setup() {
  CANVAS_W = windowWidth;
  CANVAS_H = windowHeight;
  let canvas = createCanvas(CANVAS_W, CANVAS_H);
  canvas.parent('game-container');
  
  // Setup Level Geometry
  platforms.push({ x: -2000, y: 600, w: 5000, h: 400 }); // Main Ground
  platforms.push({ x: 300, y: 450, w: 300, h: 40 }); // Lower Ledge
  platforms.push({ x: 800, y: 300, w: 400, h: 40 }); // Upper Ledge
  platforms.push({ x: -400, y: 350, w: 300, h: 40 }); // Left Ledge
  
  player = new Player(0, 400);
  
  entities.push(new Enemy(500, 400));
  entities.push(new Enemy(950, 200));
  entities.push(new Enemy(-200, 250));
  
  // Process images to remove white backgrounds
  removeWhiteBackground(imgPlayer);
  removeWhiteBackground(imgEnemy);
  removeWhiteBackground(imgWalk);
  removeWhiteBackground(imgSheathe);
  removeWhiteBackground(imgWalkUnarmed);
  removeWhiteBackground(imgEnemyWalk);
  removeWhiteBackground(imgEnemyShoot);
  removeWhiteBackground(imgPlayerDeath);
}

function windowResized() {
  CANVAS_W = windowWidth;
  CANVAS_H = windowHeight;
  resizeCanvas(CANVAS_W, CANVAS_H);
}

function removeWhiteBackground(img) {
  try {
    img.loadPixels();
    
    // First, check if the image already has transparency.
    // If it does, we assume it's a proper PNG and don't want to mess with white pixels.
    let hasTransparency = false;
    for (let i = 3; i < img.pixels.length; i += 4) {
      if (img.pixels[i] < 255) {
        hasTransparency = true;
        break;
      }
    }
    
    if (hasTransparency) {
      console.log("Image already has transparency, skipping background removal.");
      return;
    }

    // If no transparency was found, proceed with removing the white background
    for (let i = 0; i < img.pixels.length; i += 4) {
      // Use a stricter threshold (250+) to avoid killing "bright but not white" pixels
      if (img.pixels[i] > 250 && img.pixels[i+1] > 250 && img.pixels[i+2] > 250) {
        img.pixels[i+3] = 0; // Set alpha to 0 for white pixels
      }
    }
    img.updatePixels();
  } catch (e) {
    console.warn("CORS issue: Could not remove white backgrounds. Please run via a local web server.");
  }
}

function draw() {
  updateLogic();
  drawScene();
}

function updateLogic() {
  player.update();
  
  for (let i = entities.length - 1; i >= 0; i--) {
    let e = entities[i];
    e.update();
    if (e.dead) entities.splice(i, 1);
  }
  
  for (let i = particles.length - 1; i >= 0; i--) {
    let p = particles[i];
    p.update();
    if (p.dead) particles.splice(i, 1);
  }
  
  // Smooth Camera Follow
  let targetCamX = player.x - width / 2;
  let targetCamY = player.y - height / 2 - 100;
  cameraX = lerp(cameraX, targetCamX, 0.08);
  cameraY = lerp(cameraY, targetCamY, 0.08);
}

function drawScene() {
  background(10, 5, 20); // Deep dark purple background
  
  // Parallax Layer 1: Distant Mountains
  push();
  translate(-cameraX * 0.05, -cameraY * 0.05);
  // Repeat background slightly to cover space
  imageMode(CORNER);
  for(let i = -1; i <= 2; i++) {
    image(imgBg1, i * imgBg1.width, -100, imgBg1.width, imgBg1.height);
  }
  pop();
  
  // Parallax Layer 2: Industrial Ruins
  push();
  translate(-cameraX * 0.25, -cameraY * 0.25);
  imageMode(CORNER);
  for(let i = -1; i <= 2; i++) {
    image(imgBg2, i * imgBg2.width, 100, imgBg2.width, imgBg2.height);
  }
  pop();
  
  // Main Action Layer
  push();
  translate(-cameraX, -cameraY);
  
  // Draw Level Geometry
  strokeWeight(3);
  for (let p of platforms) {
    fill(COLOR_GROUND);
    stroke(COLOR_PURPLE);
    rect(p.x, p.y, p.w, p.h, 4);
    
    // Top highlight
    noStroke();
    fill(COLOR_METALLIC);
    rect(p.x, p.y, p.w, 10, 4, 4, 0, 0);
  }
  
  // Draw Particles
  for (let p of particles) p.draw();
  
  // Draw Entities
  for (let e of entities) e.draw();
  
  // Draw Player
  player.draw();
  
  pop();
}

// --- ENTITIES ---

class Player {
  constructor(x, y) {
    this.x = x;
    this.y = y;
    this.w = 75;
    this.h = 150;
    this.vx = 0;
    this.vy = 0;
    this.walkSpeed = 4;
    this.runSpeed = 16;
    this.jumpForce = -18;
    this.gravity = 0.6;
    this.dir = 1; // 1 = right, -1 = left
    
    this.state = 'IDLE'; // IDLE, WALK, RUN, JUMP, HIDE, CLIMB, CROUCH
    this.isGrounded = false;
    this.isArmed = false;
    this.nativeFacing = 1; // Default to 1 (Assuming image natively faces right)
    
    // Timers
    this.gunTimer = 0;
    this.backHitTimer = 0;
    this.climbTargetY = 0;
    this.prevKeyS = false;
    this.prevKeyC = false;
    
    this.frameIndex = 0;
    this.sheatheAnimIndex = 24; // Start at the last frame (sheathed)
    this.animatingSheathe = false;
    
    this.maxHp = 5;
    this.hp = this.maxHp;
  }
  
  hit() {
    if (this.state === 'DEAD') return;
    this.hp--;
    if (this.hp <= 0) {
      this.hp = 0;
      this.state = 'DEAD';
      this.frameIndex = 0;
    }
    // Add hit effect if needed
    for(let i=0; i<5; i++) particles.push(new Spark(this.x, this.y, random(-5,5), random(-5,5), '#ff0000'));
  }
  
  update() {
    if (this.gunTimer > 0) this.gunTimer--;
    if (this.backHitTimer > 0) this.backHitTimer--;
    
    if (this.state === 'DEAD') {
      this.vx = 0;
      this.frameIndex += 0.3;
      if (this.frameIndex >= 37) this.frameIndex = 36.9; // Stay at last frame
      
      if (!this.isGrounded) {
        this.vy += this.gravity;
        this.y += this.vy;
        this.checkCollisions();
      }
      return;
    }
    
    // Edge Trigger: Draw/Sheathe Weapon
    let keyS = keys['s'] || keys['S'];
    if (keyS && !this.prevKeyS) {
      if (this.state === 'IDLE' || this.state === 'WALK' || this.state === 'CROUCH' || this.state === 'RUN') {
        this.animatingSheathe = true;
        // If armed, start sheathing (0 -> 24). If unarmed, start drawing (24 -> 0).
        if (this.isArmed) {
          this.sheatheAnimIndex = 0;
        } else {
          this.sheatheAnimIndex = 24;
        }
        this.isArmed = !this.isArmed;
      }
    }
    this.prevKeyS = keyS;
    
    // Edge Trigger: Recalibrate Sprite Direction (if AI generated it backwards)
    let keyC = keys['c'] || keys['C'];
    if (keyC && !this.prevKeyC) {
      this.nativeFacing *= -1;
    }
    this.prevKeyC = keyC;

    let moveSpeed = this.walkSpeed;
    let tryRun = false;
    
    if (this.state !== 'HIDE' && this.state !== 'CLIMB' && this.state !== 'CROUCH') {
      
      // Determine if running
      if (!this.isArmed && (keys['d'] || keys['D'])) {
        tryRun = true;
        moveSpeed = this.runSpeed;
      }

      // Horizontal Movement
      if (keys['ArrowRight']) {
        this.vx += tryRun ? 2 : 1;
        if (this.vx > moveSpeed) this.vx = moveSpeed;
        if (this.gunTimer === 0 && this.backHitTimer === 0) this.dir = 1;
        if (this.isGrounded) this.state = tryRun ? 'RUN' : 'WALK';
      } else if (keys['ArrowLeft']) {
        this.vx -= tryRun ? 2 : 1;
        if (this.vx < -moveSpeed) this.vx = -moveSpeed;
        if (this.gunTimer === 0 && this.backHitTimer === 0) this.dir = -1;
        if (this.isGrounded) this.state = tryRun ? 'RUN' : 'WALK';
      } else {
        this.vx *= 0.6; // Friction
        if (abs(this.vx) < 0.5) this.vx = 0;
        if (this.isGrounded) this.state = 'IDLE';
      }
      
      // Hide / Cover (Up Arrow)
      if (keys['ArrowUp'] && this.isGrounded && abs(this.vx) < 1) {
        this.state = 'HIDE';
        this.vx = 0;
        playSound('hide_shadows');
      }
      
      // Crouch (Down Arrow)
      if (keys['ArrowDown'] && this.isGrounded) {
        this.state = 'CROUCH';
        this.vx = 0;
      }
      
      // Action Key: Space / F
      let actionKey = keys[' '] || keys['f'] || keys['F'];
      
      if (actionKey && this.isGrounded && !this.actionPressed) {
        if (!this.isArmed) {
          // Jump Forward
          this.vy = this.jumpForce;
          this.vx = this.dir * this.runSpeed; // leaping forward
          this.isGrounded = false;
          this.state = 'JUMP';
        } else {
          // Shoot Forward
          this.shoot(1);
        }
        this.actionPressed = true;
      }
      if (!actionKey) this.actionPressed = false;
      
      // Action Key: D (when armed, shoots backwards)
      if (this.isArmed && (keys['d'] || keys['D']) && !this.backActionPressed) {
        this.shoot(-1);
        this.backActionPressed = true;
      }
      if (!(keys['d'] || keys['D'])) this.backActionPressed = false;
      
      // Ledge Climb Detection (Falling and pressing UP, or just falling near ledge)
      if (!this.isGrounded && this.vy > 0 && keys['ArrowUp']) {
        let handY = this.y - this.h/2 + 10;
        let reach = 20;
        for (let p of platforms) {
          if (handY > p.y - 20 && handY < p.y + 10) {
            if (this.dir === 1 && this.x + this.w/2 > p.x - reach && this.x + this.w/2 < p.x + 10) {
              this.startClimb(p.x, p.y);
            }
            else if (this.dir === -1 && this.x - this.w/2 < p.x + p.w + reach && this.x - this.w/2 > p.x + p.w - 10) {
              this.startClimb(p.x + p.w, p.y);
            }
          }
        }
      }
    } else if (this.state === 'HIDE') {
      if (!keys['ArrowUp']) this.state = 'IDLE';
    } else if (this.state === 'CROUCH') {
      if (!keys['ArrowDown']) this.state = 'IDLE';
      // Can shoot while crouched? Let's say yes for completeness
      let actionKey = keys[' '] || keys['f'] || keys['F'];
      if (this.isArmed && actionKey && !this.actionPressed) {
        this.shoot(1, true); // crouch shoot
        this.actionPressed = true;
      }
      if (!actionKey) this.actionPressed = false;
    } else if (this.state === 'CLIMB') {
      this.vy = 0;
      this.vx = 0;
      this.y -= 4; 
      if (this.y <= this.climbTargetY) {
        this.y = this.climbTargetY;
        this.x += this.dir * 30; 
        this.state = 'IDLE';
      }
    }
    
    if (this.state !== 'CLIMB') {
      this.vy += this.gravity;
      this.x += this.vx;
      this.y += this.vy;
      this.checkCollisions();
    }
    
    // Animation Frame Logic
    if (this.state === 'RUN' || this.state === 'WALK') {
      let animSpeed = this.state === 'RUN' ? 1.6 : 0.4;
      this.frameIndex += animSpeed;
      if (this.frameIndex >= 24) this.frameIndex = 0;
    } else {
      this.frameIndex = 0;
    }

    // Sheathe Animation Logic
    if (this.animatingSheathe) {
      if (!this.isArmed) { // We just toggled isArmed to false, so we are currently sheathing (0 -> 24)
        this.sheatheAnimIndex += 1.0;
        if (this.sheatheAnimIndex >= 24) {
          this.sheatheAnimIndex = 24;
          this.animatingSheathe = false;
        }
      } else { // We just toggled isArmed to true, so we are currently drawing (24 -> 0)
        this.sheatheAnimIndex -= 1.0;
        if (this.sheatheAnimIndex <= 0) {
          this.sheatheAnimIndex = 0;
          this.animatingSheathe = false;
        }
      }
    }
  }
  
  startClimb(edgeX, edgeY) {
    this.state = 'CLIMB';
    this.vx = 0;
    this.vy = 0;
    this.x = this.dir === 1 ? edgeX - this.w/2 : edgeX + this.w/2;
    this.climbTargetY = edgeY - this.h/2;
  }
  
  shoot(dirMult, isCrouched = false) {
    if (this.state === 'HIDE' || this.state === 'CLIMB') return;
    
    let shootDir = this.dir * dirMult;
    let spawnX = this.x + (this.w/2 + 52) * shootDir;
    let spawnY = isCrouched ? this.y + 15 : this.y - 22;
    
    let p = new Projectile(spawnX, spawnY, shootDir * 18, 0, true);
    particles.push(p);
    particles.push(new MuzzleFlash(spawnX, spawnY, shootDir));
    
    if (dirMult === -1) {
      this.backHitTimer = 15;
    } else {
      this.gunTimer = 12;
    }
    playSound('shotgun_blast');
  }
  
  checkCollisions() {
    this.isGrounded = false;
    for (let p of platforms) {
      if (this.x + this.w/2 > p.x && this.x - this.w/2 < p.x + p.w) {
        if (this.vy > 0 && this.y + this.h/2 >= p.y && this.y - this.vy + this.h/2 <= p.y + 15) {
          this.y = p.y - this.h/2;
          this.vy = 0;
          this.isGrounded = true;
        } else if (this.vy < 0 && this.y - this.h/2 <= p.y + p.h && this.y - this.vy - this.h/2 >= p.y + p.h - 10) {
          this.y = p.y + p.h + this.h/2;
          this.vy = 0;
        }
      }
    }
    if (!this.isGrounded && this.state !== 'CLIMB' && this.state !== 'JUMP') {
      this.state = 'JUMP';
    }
  }
  
  draw() {
    push();
    translate(this.x, this.y);
    
    // Determine the true visual direction by factoring in the AI native sprite direction
    let logicalDir = this.backHitTimer > 0 ? -this.dir : this.dir;
    let visualDir = logicalDir * this.nativeFacing;
    scale(visualDir, 1);
    
    if (this.state === 'HIDE') {
      drawingContext.globalAlpha = 0.3; // Melting into shadow
      drawingContext.shadowBlur = 20;
      drawingContext.shadowColor = 'black';
    }
    
    if (this.state === 'CROUCH') {
      translate(0, this.h/4);
    }
    
    imageMode(CENTER);
    let drawW = 180;
    let drawH = 180;
    
    // Animation logic (Only keep rotation for Jump)
    let rot = 0;
    if (this.state === 'JUMP') {
        rot = -0.1;
    }
    rotate(rot);

    if (this.state === 'DEAD' && imgPlayerDeath) {
       // Native is LEFT (-1). Flip if dir is 1 (RIGHT).
       pop();
       push();
       
       // Use standard draw size
       let deathW = drawW;
       let deathH = drawH;
       
       // Anchor at the player's FEET for a consistent ground level
       translate(this.x, this.y + this.h/2);
       
       if (this.dir === 1) scale(-1, 1);
       else scale(1, 1);

       let fIndex = floor(this.frameIndex);
       if (fIndex > 36) fIndex = 36;
       
       let cols = 7;
       let rows = 6;
       let fw = imgPlayerDeath.width / cols;
       let fh = imgPlayerDeath.height / rows;
       let col = fIndex % cols;
       let row = floor(fIndex / cols);
       
       imageMode(CORNER);
       // Draw so the bottom-center of the frame is at the feet position (0,0)
       image(imgPlayerDeath, -deathW/2, -deathH, deathW, deathH, col * fw, row * fh, fw, fh);
    } else if ((this.state === 'RUN' || this.state === 'WALK')) {
       let targetImg = this.isArmed ? imgWalk : imgWalkUnarmed;
       
       if (targetImg) {
         let fIndex = floor(this.frameIndex);
         if (fIndex > 23) fIndex = 23;
         if (fIndex < 0) fIndex = 0;
         
         let cols = 5;
         let rows = 5;
         let fw = targetImg.width / cols;
         let fh = targetImg.height / rows;
         let col = fIndex % cols;
         let row = floor(fIndex / cols);
         
         image(targetImg, 0, 0, drawW, drawH, col * fw, row * fh, fw, fh);
       }
    } else if (imgSheathe && (this.animatingSheathe || !this.isArmed)) {
       // Use Sheathe spritesheet for unarmed idle or sheathing/drawing animation
       let fIndex = floor(this.sheatheAnimIndex);
       let cols = 5;
       let rows = 5;
       let fw = imgSheathe.width / cols;
       let fh = imgSheathe.height / rows;
       let col = fIndex % cols;
       let row = floor(fIndex / cols);
       
       push();
       scale(-1, 1); // Mirror because native is left-oriented
       image(imgSheathe, 0, 0, drawW, drawH, col * fw, row * fh, fw, fh);
       pop();
    } else if (imgPlayer) {
       push();
       scale(-1, 1); // Flip idle sprite so it matches the Walk spritesheet's native direction
       image(imgPlayer, 0, 0, drawW, drawH);
       pop();
    } else {
       fill(200, 0, 0);
       rect(0, 0, this.w, this.h);
    }
    
    pop();
    
    // Draw Player Health Bar
    this.drawHealthBar();
    
    drawingContext.globalAlpha = 1.0;
    drawingContext.shadowBlur = 0;
  }
  
  drawHealthBar() {
    push();
    translate(this.x, this.y - this.h/2 - 20);
    noStroke();
    // Background
    fill(40, 0, 0, 200);
    rectMode(CENTER);
    rect(0, 0, 100, 8, 4);
    // Fill
    let pct = this.hp / this.maxHp;
    fill(255, 50, 50);
    rectMode(CORNER);
    rect(-50, -4, 100 * pct, 8, 4);
    pop();
  }
}

class Enemy {
  constructor(x, y) {
    this.x = x;
    this.y = y;
    this.w = 75;
    this.h = 150;
    this.vx = 0;
    this.vy = 0;
    this.gravity = 0.6;
    this.dead = false;
    this.hp = 3;
    this.maxHp = 3;
    this.dir = 1; // 1 = right, -1 = left
    this.walkSpeed = 2;
    this.frameIndex = 0;
    this.changeDirTimer = 0;
    this.state = 'IDLE'; // IDLE, WALK, SHOOT
    
    // AI / Combat
    this.shootTimer = 0;
    this.detectionRange = 700;
    
    // Animation matrix config
    this.cols = 6;
    this.rows = 5;
    this.totalFrames = this.cols * this.rows;
    
    this.shootCols = 4;
    this.shootRows = 4;
    this.totalShootFrames = 14;
    this.firedThisCycle = false;
  }
  
  update() {
    if (this.dead) return;

    // Detection Logic
    let distToPlayer = dist(this.x, this.y, player.x, player.y);
    let playerInFront = (this.dir === 1 && player.x > this.x) || (this.dir === -1 && player.x < this.x);
    let sameLevel = abs(this.y - player.y) < 50;
    let canSeePlayer = player.state !== 'HIDE' && player.state !== 'DEAD' && distToPlayer < this.detectionRange && playerInFront && sameLevel;
    
    if (canSeePlayer) {
      if (this.state !== 'SHOOT') {
        this.state = 'SHOOT';
        this.frameIndex = 0;
        this.shootTimer = 0;
      }
    } else if (this.state === 'SHOOT') {
      // Return to idle if player lost
      this.state = 'IDLE';
    }

    if (this.state === 'SHOOT') {
      this.vx = 0;
      this.shootTimer++;
      
      // Update shoot animation
      this.frameIndex += 0.5;
      if (this.frameIndex >= this.totalShootFrames) {
        this.frameIndex = 0;
        this.firedThisCycle = false;
      }
      
      // Fire bullet at specific frame (e.g., frame 7)
      if (floor(this.frameIndex) === 7 && !this.firedThisCycle) {
        this.shoot();
        this.firedThisCycle = true;
      }
      
    } else {
      // Random Walk / Idle Logic
      if (this.changeDirTimer <= 0) {
        let r = random();
        if (r < 0.4) {
          this.state = 'IDLE';
          this.vx = 0;
          this.changeDirTimer = random(60, 120);
        } else {
          this.state = 'WALK';
          this.dir = random() > 0.5 ? 1 : -1;
          this.changeDirTimer = random(120, 300);
        }
      }
      this.changeDirTimer--;
      
      if (this.state === 'WALK') {
        this.vx = this.dir * this.walkSpeed;
      } else {
        this.vx = 0;
      }
    }
    
    this.vy += this.gravity;
    this.x += this.vx;
    this.y += this.vy;
    
    // Collision and Edge detection (don't walk off platforms if possible)
    let onPlatform = false;
    for (let p of platforms) {
      // Vertical Collision
      if (this.x + this.w/2 > p.x && this.x - this.w/2 < p.x + p.w) {
        if (this.vy > 0 && this.y + this.h/2 >= p.y && this.y - this.vy + this.h/2 <= p.y + 15) {
          this.y = p.y - this.h/2;
          this.vy = 0;
          onPlatform = true;
          
          if (this.state === 'WALK') {
            // Edge Detection: Reverse if about to walk off
            let edgeMargin = 30;
            if (this.dir === 1 && this.x + edgeMargin > p.x + p.w) {
              this.dir = -1;
            } else if (this.dir === -1 && this.x - edgeMargin < p.x) {
              this.dir = 1;
            }
          }
        }
      }
    }
    
    // Update Animation Frame
    let animSpeed = this.state === 'WALK' ? 0.4 : 0.1;
    if (this.state !== 'SHOOT') {
      this.frameIndex += animSpeed;
      if (this.frameIndex >= this.totalFrames) {
        this.frameIndex = 0;
      }
    }
  }
  
  shoot() {
    let spawnX = this.x + (this.w/2 + 20) * this.dir;
    let spawnY = this.y - 10;
    let p = new Projectile(spawnX, spawnY, this.dir * 12, 0, false);
    particles.push(p);
    particles.push(new MuzzleFlash(spawnX, spawnY, this.dir));
    playSound('enemy_shot');
  }
  
  hit() {
    if (player.state === 'HIDE') return; 
    this.hp--;
    if (this.hp <= 0) {
      this.dead = true;
      // Drop health or something?
    }
  }
  
  draw() {
    if (this.dead) return;

    push();
    translate(this.x, this.y);
    
    imageMode(CENTER);
    let drawW = 180;
    let drawH = 180;
    
    if (this.state === 'SHOOT' && imgEnemyShoot) {
      // Native is LEFT. Flip if dir is 1 (RIGHT).
      if (this.dir === 1) scale(-1, 1);
      
      let fIndex = floor(this.frameIndex) % this.totalShootFrames;
      let fw = imgEnemyShoot.width / this.shootCols;
      let fh = imgEnemyShoot.height / this.shootRows;
      let col = fIndex % this.shootCols;
      let row = floor(fIndex / this.shootCols);
      
      image(imgEnemyShoot, 0, 0, drawW, drawH, col * fw, row * fh, fw, fh);
      
    } else if (imgEnemyWalk && (this.state === 'WALK' || this.state === 'IDLE')) {
      // Native is RIGHT. Flip if dir is -1 (LEFT).
      if (this.dir === -1) scale(-1, 1);
      
      let fIndex = this.state === 'IDLE' ? 0 : floor(this.frameIndex);
      fIndex = constrain(fIndex, 0, this.totalFrames - 1);
      
      let fw = 512;
      let fh = 512;
      let col = fIndex % this.cols;
      let row = floor(fIndex / this.cols);
      
      image(imgEnemyWalk, 0, 0, drawW, drawH, col * fw, row * fh, fw, fh);
    } else {
       // Fallback
       scale(this.dir, 1);
       if (imgEnemy) {
          image(imgEnemy, 0, 0, drawW, drawH);
       } else {
          fill(0, 0, 200);
          rect(0, 0, this.w, this.h);
       }
    }
    
    pop();
    
    // Draw Enemy Health Bar
    this.drawHealthBar();
  }

  drawHealthBar() {
    push();
    translate(this.x, this.y - this.h/2 - 20);
    noStroke();
    // Background
    fill(40, 0, 0, 200);
    rectMode(CENTER);
    rect(0, 0, 60, 6, 2);
    // Fill
    let pct = this.hp / this.maxHp;
    fill(255, 50, 50);
    rectMode(CORNER);
    rect(-30, -3, 60 * pct, 6, 2);
    pop();
  }
}

class Projectile {
  constructor(x, y, vx, vy, isPlayer) {
    this.x = x;
    this.y = y;
    this.vx = vx;
    this.vy = vy;
    this.isPlayer = isPlayer;
    this.life = 80;
    this.dead = false;
    
    for (let i=0; i<3; i++) particles.push(new Spark(x, y, vx*0.2, random(-2, 2), COLOR_NEON));
  }
  
  update() {
    this.x += this.vx;
    this.y += this.vy;
    this.life--;
    if (this.life <= 0) this.dead = true;
    
    if (this.life % 2 === 0) particles.push(new Trail(this.x, this.y));
    
    if (this.isPlayer) {
      for (let e of entities) {
        if (!e.dead && abs(this.x - e.x) < e.w/2 + 20 && abs(this.y - e.y) < e.h/2 + 20) {
          e.hit();
          this.dead = true;
          this.explode();
          return;
        }
      }
    } else {
      // Enemy projectile hitting player
      if (abs(this.x - player.x) < player.w/2 + 20 && abs(this.y - player.y) < player.h/2 + 40) {
        player.hit();
        this.dead = true;
        this.explode();
        return;
      }
    }
    
    for (let p of platforms) {
      if (this.x > p.x && this.x < p.x + p.w && this.y > p.y && this.y < p.y + p.h) {
        this.dead = true;
        this.explode();
        return;
      }
    }
  }
  
  explode() {
    for(let i=0; i<8; i++) particles.push(new Spark(this.x, this.y, random(-5,5), random(-5,5), COLOR_NEON));
  }
  
  draw() {
    push();
    fill(COLOR_NEON);
    noStroke();
    drawingContext.shadowBlur = 20;
    drawingContext.shadowColor = COLOR_NEON;
    ellipse(this.x, this.y, 16, 6);
    pop();
  }
}

class MuzzleFlash {
  constructor(x, y, dir) {
    this.x = x;
    this.y = y;
    this.dir = dir;
    this.life = 6;
  }
  update() {
    this.life--;
    if (this.life <= 0) this.dead = true;
  }
  draw() {
    push();
    translate(this.x, this.y);
    scale(this.dir, 1);
    
    let alpha = map(this.life, 0, 6, 0, 255);
    fill(255, 200, 255, alpha);
    drawingContext.shadowBlur = 30;
    drawingContext.shadowColor = COLOR_NEON;
    drawingContext.globalCompositeOperation = 'screen';
    
    beginShape();
    vertex(0, -8);
    vertex(30, -12);
    vertex(45, 0);
    vertex(30, 12);
    vertex(0, 8);
    endShape(CLOSE);
    pop();
  }
}

class Spark {
  constructor(x, y, vx, vy, colorStr) {
    this.x = x;
    this.y = y;
    this.vx = vx;
    this.vy = vy;
    this.colorStr = colorStr;
    this.life = random(15, 30);
    this.maxLife = this.life;
  }
  update() {
    this.x += this.vx;
    this.y += this.vy;
    this.vy += 0.4;
    this.life--;
    if (this.life <= 0) this.dead = true;
  }
  draw() {
    push();
    let alpha = map(this.life, 0, this.maxLife, 0, 255);
    let c = color(this.colorStr);
    c.setAlpha(alpha);
    fill(c);
    noStroke();
    circle(this.x, this.y, 4);
    pop();
  }
}

class Trail {
  constructor(x, y) {
    this.x = x;
    this.y = y;
    this.life = 10;
  }
  update() {
    this.life--;
    if (this.life <= 0) this.dead = true;
  }
  draw() {
    push();
    let c = color(COLOR_NEON);
    c.setAlpha(this.life * 25);
    fill(c);
    noStroke();
    circle(this.x, this.y, this.life);
    pop();
  }
}

// Input listeners
window.addEventListener('keydown', (e) => {
  keys[e.key] = true;
});
window.addEventListener('keyup', (e) => {
  keys[e.key] = false;
});

function playSound(name) {
  // Sound hook
}
