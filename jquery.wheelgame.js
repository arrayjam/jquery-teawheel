/**
 * Wheel Game - jQuery plugin for a "Wheel of Fortune" (tm) style game
 */

if (console == undefined || console.log == undefined) {
	var console = {
		log: function() {}
	};
}

$.fn.setRotation = function(degrees) {
	degrees = parseInt(degrees);
	// TODO: Add MSIE support?
	return $(this).css('-webkit-transform', 'rotate('+degrees+'deg)').css('-moz-transform', 'rotate('+degrees+'deg)');
};

$.fn.wheelgame = function(settings) {
	settings = $.extend({
		shuffle: false,
		colors: ["#B8D430", "#3AB745", "#029990", "#3501CB", "#2E2C75", "#673A7E", "#CC0071", "#F80120", "#F35B20", "#FB9A00", "#FFCC00", "#FEF200"],
		borderColor: 'black',
		fps: 30,
		smoothFrames: 10,
		update: function() {},
		finished: function() {},
		initialAngle: Math.random() * 360,
	}, settings || {});
	
	// Point object
	var Point = function(x, y) {
		this.x = x;
		this.y = y;
	};
	Point.prototype = new Object();
	Point.prototype.constructor = Point;
	
	// Hide parent DIV and create our canvas
	this.hide();
	var size = {width: this.width(), height: this.height()};
	var center = new Point(Math.round(size.width / 2), Math.round(size.height / 2));
	//var center = {x: size.width / 2, y: size.height / 2};
	var radius = ((size.width > size.height ? size.height : size.width) / 2) * 0.9;
	this.after('<canvas id="wheelgame_canvas" width="' + size.width + '" height="' + size.height + '"></canvas>');
	var canvas = $('#wheelgame_canvas').get(0);
	var slices = [];
	var animating = false;
	var lastFrameTime = 0;
	var tickSpeed = (1 / settings.fps) * 1000;
	var velocity = 0;
	var dragging = false;
	var dragLastAngles = [];
	var dragLastTimes = [];
	var dragLastAngle = 0;
	var dragLastTime = 0;
	var dragAngleOffset = 0;
	var wheelAngle = settings.initialAngle;
	var selectedSlice = null;
	
	var degToRad = function(deg) {
		return deg * (Math.PI / 180.0);
	};
	var radToDeg = function(rad) {
		return rad * (180.0 / Math.PI);
	};
	
	var drawWheel = function(offsetDegrees) {
		if (!canvas.getContext) {
			console.log('Unable to use canvas');
			return;
		}
		var context = canvas.getContext('2d');
		canvas.width = canvas.width; // clear canvas
		context.strokeStyle = settings.borderColor;
		context.fillStyle = 'white';
		context.lineWidth = 1;
		
		var degPerSlice = 360 / slices.length;
		var deg = offsetDegrees || 0;
		// Draw outer circle
		context.beginPath();
		context.arc(center.x, center.y, radius, 0, Math.PI * 2, true);
		context.stroke();
		context.closePath();
		
		// Draw slices
		for (var i = 0; i < slices.length; i++) {
			drawSlice(slices[i], deg, degPerSlice, context, settings.colors[i % settings.colors.length], null);
			if ((deg == 0) || (deg + degPerSlice > 360)) {
				// Selected!
				if (selectedSlice != slices[i]) {
					console.log('slices[i]='+slices[i].name+ ' (deg='+deg+' degPerSlice='+degPerSlice+')');
					selectedSlice = slices[i];
					settings.update(selectedSlice);
				}
			}
			deg = (deg + degPerSlice) % 360;
		}
	};
	
	var drawSlice = function(slice, offsetDegrees, sizeDegrees, context, fillStyle, strokeStyle, textColor) {
		fillStyle = fillStyle || 'white';
		strokeStyle = strokeStyle || 'black';
		textColor = textColor || 'black';
		
		context.fillStyle = fillStyle;
		context.strokeStyle = strokeStyle;

		// Draw pie slice
		context.beginPath();
		context.moveTo(center.x, center.y);
		context.arc(center.x, center.y, radius, degToRad(offsetDegrees), degToRad(offsetDegrees + sizeDegrees), 0);
		context.lineTo(center.x, center.y);
		context.stroke();
		context.fill();
		context.closePath();
		
		// Draw text, choose colour based on Perceptive Luminance (http://stackoverflow.com/questions/1855884/determine-font-color-based-on-background-color)
		tmpcolor = fillStyle.match(/^#([0-9a-fA-F]{2})([0-9a-fA-F]{2})([0-9a-fA-F]{2})$/);
		tmpcolorlum = (1 - ( 0.299 * (parseInt(tmpcolor[1], 16)/255) + 0.587 * (parseInt(tmpcolor[2], 16)/255) + 0.114 * (parseInt(tmpcolor[3], 16)/255)/255));
		if(tmpcolorlum < 0.5) {
			context.fillStyle = 'black';
		}
		else {
			context.fillStyle = 'white';
		}
		var sliceCenterRads = degToRad(offsetDegrees + (sizeDegrees / 2));
		var sliceCenterX = (radius * 0.7) * Math.cos(sliceCenterRads);
		var sliceCenterY = (radius * 0.7) * Math.sin(sliceCenterRads);
		context.translate(center.x + sliceCenterX, center.y + sliceCenterY);
		context.textAlign = 'center';
		context.fillText(slice.name, 0, 0);
		
		// Reset transform (load identity)
		context.setTransform(1, 0, 0, 1, 0, 0);
	};
	
	this.spin = function(v) {
		velocity = v || Math.random() * 600 + 400;
		animating = true;
		animateFrame();
	};
	
	this.setAngle = function(a) {
		animating = false;
		wheelAngle = a || 0;
		drawWheel(wheelAngle);
	};
	
	var animateFrame = function() {
		var decayFactor = 0.99;
		var currTime = new Date().getTime();
		if (!animating) {
			return;
		}
		if (lastFrameTime < 1) {
			lastFrameTime = currTime;
			setTimeout(animateFrame, tickSpeed);
			return;
		}
		var tDiff = (currTime - lastFrameTime) / 1000;
		var angleChange = velocity * tDiff;
		var oldWheelAngle = wheelAngle;
		velocity -= (velocity * decayFactor * tDiff);
		wheelAngle = (3600 + angleChange + wheelAngle) % 360;


		$("#debugangle").text(velocity);


		drawWheel(wheelAngle);
		lastFrameTime = currTime;
		if (Math.abs(velocity) > 1.0) {
			setTimeout(animateFrame, tickSpeed);
		} else {
			// Stop animation
			animating = false;
			velocity = 0;
			lastFrameTime = 0;
			settings.finished(selectedSlice);
		}
	};
	
	var updateDrag = function(pointFromCenter) {
		dragLastTime = new Date().getTime();
		dragLastAngle = radToDeg(Math.atan(pointFromCenter.y / pointFromCenter.x));
		if (pointFromCenter.x >= 0 && pointFromCenter.y >= 0) {
			// This quadrant is already correct
		} else if (pointFromCenter.x <= 0) {
			// Both quadrants same
			dragLastAngle += 180;
		} else {
			dragLastAngle += 360;
		}
		dragLastAngles.unshift(dragLastAngle);
		dragLastTimes.unshift(dragLastTime);
		if (dragLastAngles.length > settings.smoothFrames) {
			dragLastAngles.pop();
			dragLastTimes.pop();
		}
	};
	
	$(canvas).bind("mousedown touchstart", function(e) {
		var mousePoint = new Point(e.pageX - this.offsetLeft, e.pageY - this.offsetTop);
		var pointFromCenter = new Point(mousePoint.x - center.x, mousePoint.y - center.y);

		dragging = true;
		animating = false;
		velocity = 0;
		dragLastAngles = [];
		dragLastTimes = [];
		updateDrag(pointFromCenter);
		dragAngleOffset = (360 + dragLastAngle - wheelAngle) % 360;
	});
	
	$(canvas).bind("mouseup touchend",function(e) {
		if (!dragging) {
			return;
		}
		dragging = false;

		var mousePoint = new Point(e.pageX - this.offsetLeft, e.pageY - this.offsetTop);
		var pointFromCenter = new Point(mousePoint.x - center.x, mousePoint.y - center.y);
		var oldAngle = dragLastAngles[dragLastAngles.length - 1];
		var oldTime = dragLastTimes[dragLastTimes.length - 1];
		updateDrag(pointFromCenter);
		var currTime = new Date().getTime();
		var currVelocity = (dragLastAngle - oldAngle) / ((dragLastTime - oldTime) / 1000);
		if (Math.abs(dragLastAngle - oldAngle) > 180) {
			// Correct for pulling through the 0deg mark
			currVelocity *= -1;
		}
		if (Math.abs(currVelocity) > 1) {
			// Start animation
			console.log('Throwing with velocity ' + currVelocity);
			velocity = -currVelocity; // Needs to be negative on touch devices. Why?
			animating = true;
			animateFrame();
		}
	});
	
	$(canvas).bind("mousemove touchmove",function(e) {
		if (!dragging) {
			return;
		}
		
		var mousePoint = new Point(e.pageX - this.offsetLeft, e.pageY - this.offsetTop);
		var pointFromCenter = new Point(mousePoint.x - center.x, mousePoint.y - center.y);

		updateDrag(pointFromCenter);
		wheelAngle = (360 + dragLastAngle - dragAngleOffset) % 360;
		drawWheel(wheelAngle);
	});
	
	var shuffle = function(arr) {
		// Fisher-Yates shuffle
		for (var i = arr.length - 1; i; --i) {
			j = parseInt(Math.random() * i);
			x = arr[i];
			arr[i] = arr[j];
			arr[j] = x;
		}
	};
	
	var num = this.children().length;
	this.children().each(function() {
		var elem = this;
		var slice = {url: null, name: $(this).text()};
		if ($(this).find('a').length) {
			slice.url = $(this).find('a').attr('href');
		}
		slices.push(slice);
	});


	$('#addbtn').bind("mouseup touchend",function() {
		slices.push({url: null, name: $('#addnewtext').val()});
		if (settings.shuffle) {
			shuffle(slices);
		}
		drawWheel(wheelAngle);
	});
	
	if (settings.shuffle) {
		shuffle(slices);
	}
	
	drawWheel(settings.initialAngle);
	return this;
};
