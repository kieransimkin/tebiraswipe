/* 	jQuery Mobile's swipe event is unsatisfactory in a number of ways - primarily because you're only aware when the swipe
	when it ends - I want to be able to	update the on-screen position of the item being swiped as the swipe is occuring
	(as would happen in most native Apps).	Also, I don't like the way you have to override the swipe event handler's internal
	functions if you want to catch the swipestart event. It should trigger proper events for you to catch in the normal way.

	Or to put it more simply, jQuery Mobile doesn't have swipestart, swipemove and swipecancel events, and I want them.
	I've therefore put together this enhanced version of jQuery Mobile's	swipe event, which gives you those events.

	With this modification, a swipe starts when a touch gesture moves at least 'horizontalDistanceThreshold' in the
	horizontal direction, and not more than 'verticalDistanceThreshold' in the vertical direction. At this point you will
	get a 'tebiraswipestart' event. You will then receive zero or more 'tebiraswipemove' events as the swipe progresses,
	followed by either a 'tebiraswipecancel' event (if the swipe moved outside of the allowed area, or took too long), or a
	'tebiraswipe' event if the swipe was successful - if the swipe was successful you will also receive a 'tebiraswipeleft'
	or a 'tebiraswiperight' event depending on which way the swipe went.

	The other useful thing it does is pass information back about the drag offsets when triggering these events - useful
	if you want the page to appear to slide across as you drag your finger across the screen.

	~Kieran Simkin
	Copyright Tebira 2013
	*/


(function( $, window, undefined ) {
	var $document = $( document );

	// add new event shortcuts
	$.each( ( "tebiraswipe tebiraswipeleft tebiraswiperight tebiraswipestart tebiraswipemove tebiraswipecancel").split( " " ), function( i, name ) {

		$.fn[ name ] = function( fn ) {
			return fn ? this.bind( name, fn ) : this.trigger( name );
		};

		// jQuery < 1.8
		if ( $.attrFn ) {
			$.attrFn[ name ] = true;
		}
	});

	var supportTouch = $.mobile.support.touch,
		touchStartEvent = supportTouch ? "touchstart" : "mousedown",
		touchStopEvent = supportTouch ? "touchend" : "mouseup",
		touchMoveEvent = supportTouch ? "touchmove" : "mousemove";

	function triggerCustomEvent( obj, eventType, event ) {
		var originalType = event.type;
		event.type = eventType;
		$.event.dispatch.call( obj, event );
		event.type = originalType;
	}


	// also handles swipeleft, swiperight
	$.event.special.tebiraswipe = {

		// These should really be in relative units rather than pixels - otherwise we will get
		// different swipe sensitivity on devices with different pixel densities - this deficiency
		// exists in the original JQM swipe event code too.

		scrollSupressionThreshold: 25, // More than this horizontal displacement, and we will suppress scrolling.

		durationThreshold: 1500, // More time than this, and it isn't a swipe.

		horizontalDistanceThreshold: 25,  // Swipe horizontal displacement must be more than this.

		verticalDistanceThreshold: 75,  // Swipe vertical displacement must be less than this.

		start: function( event ) {
			var data = event.originalEvent.touches ?
					event.originalEvent.touches[ 0 ] : event;
			return {
						time: ( new Date() ).getTime(),
						coords: [ data.pageX, data.pageY ],
						origin: $( event.target )
					};
		},

		stop: function( event ) {
			var data = event.originalEvent.touches ?
					event.originalEvent.touches[ 0 ] : event;
			return {
						time: ( new Date() ).getTime(),
						coords: [ data.pageX, data.pageY ]
					};
		},

		handleSwipe: function( start, stop ) {


			if (Math.abs( start.coords[ 0 ] - stop.coords[ 0 ] ) > $.event.special.tebiraswipe.horizontalDistanceThreshold &&
				Math.abs( start.coords[ 1 ] - stop.coords[ 1 ] ) < $.event.special.tebiraswipe.verticalDistanceThreshold ) {
				// Successful swipe - this is effectively the swipeend event.
				start.origin.trigger( "tebiraswipe", {origin: start.origin, start: start, stop: stop, offset: [stop.coords[0]-start.coords[0], stop.coords[1]-start.coords[1]]})
					.trigger( start.coords[0] > stop.coords[ 0 ] ? "tebiraswipeleft" : "tebiraswiperight", {origin: start.origin, start: start, stop: stop, offset: [stop.coords[0]-start.coords[0], stop.coords[1]-start.coords[1]]});
			} else {
				// Swipe moved outside of the allowed zone, cancel it - currently we only do this when the swipe is released (unlike the timeout
				// which can happen at any point). I suspect this is the correct behaviour, but only extensive testing will show for sure.
				start.origin.trigger('tebiraswipecancel', {origin: start.origin, start: start, stop: stop, offset: [stop.coords[0]-start.coords[0], stop.coords[1]-start.coords[1]]});
			}
		},

		setup: function() {

			var thisObject = this,
				$this = $( thisObject );

			$this.bind( touchStartEvent, function( event ) {
				var start = $.event.special.tebiraswipe.start( event ),
					stop, started=false;

				function moveHandler( event ) {
					if ( !start ) {
						return;
					}

					stop = $.event.special.tebiraswipe.stop( event );

					if (!started && typeof(stop) != 'undefined' &&
						 Math.abs( start.coords[ 0 ] - stop.coords[ 0 ] ) > $.event.special.tebiraswipe.horizontalDistanceThreshold &&
						 Math.abs( start.coords[ 1 ] - stop.coords[ 1 ] ) < $.event.special.tebiraswipe.verticalDistanceThreshold ) {
					 	// Touch gesture has moved far enough in the horizontal direction and not too far in the vertical direction for it to be
					 	// considered a swipe. Trigger the swipestart event.
					 	started = true;
					 	start.origin.trigger("tebiraswipestart", {origin: start.origin, start: start, stop: stop, offset: [stop.coords[0]-start.coords[0], stop.coords[1]-start.coords[1]]});

			 		}
			 		if (started) {
			 			if ( stop.time - start.time > $.event.special.tebiraswipe.durationThreshold) {
		 					// Swipe went on too long, cancel it.
							start.origin.trigger('tebiraswipecancel', {origin: start.origin, start: start, stop: stop, offset: [stop.coords[0]-start.coords[0], stop.coords[1]-start.coords[1]]});
							$this.unbind( touchMoveEvent, moveHandler );
							start = stop = undefined;
							started = false;
							return;
						}
			 			// If the swipe has started, and we're still moving, keep triggering the swipemove event, so that we can visually
		 				// represent that movement to the user.
			 			start.origin.trigger("tebiraswipemove", {origin: start.origin, start: start, stop: stop, offset: [stop.coords[0]-start.coords[0], stop.coords[1]-start.coords[1]]});
		 			}


					// prevent scrolling
					if ( Math.abs( start.coords[ 0 ] - stop.coords[ 0 ] ) > $.event.special.tebiraswipe.scrollSupressionThreshold ) {
						event.preventDefault();
					}
				}

				$this.bind( touchMoveEvent, moveHandler )
					.one( touchStopEvent, function() {

						$this.unbind( touchMoveEvent, moveHandler );

						if ( start && stop && started ) {
							$.event.special.tebiraswipe.handleSwipe( start, stop );
						}
						start = stop = undefined;
					});
			});
		}
	};
	$.each({
		tebiraswipeleft: "tebiraswipe",
		tebiraswiperight: "tebiraswipe",
		tebiraswipestart: "tebiraswipe",
		tebiraswipemove: "tebiraswipe",
		tebiraswipecancel: "tebiraswipe"
	}, function( event, sourceEvent ) {

		$.event.special[ event ] = {
			setup: function() {
				$( this ).bind( sourceEvent, $.noop );
			}
		};
	});

})( jQuery, this );
