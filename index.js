/**
 *
 * @author    Jerry Bendy
 * @since     4/12/2017
 */

function touchX(event) {
    return event.touches [0].clientX;
}

function touchY(event) {
    return event.touches [0].clientY;
}


var vueTouchEvents = {
    install: function (Vue, options) {

        // Set default options
        options = options || {}
        options.disableClick = options.disableClick || false
        options.tapTolerance = options.tapTolerance || 10
        options.swipeTolerance = options.swipeTolerance || 30
        options.touchClass = options.touchClass || ''


        var touchStartEvent = function (event) {
                var $this = this.$$touchObj

                $this.supportTouch = true

                if ($this.touchStarted) {
                    return
                }

                addTouchClass(this)

                $this.touchStarted = true

                $this.touchMoved = false
                $this.swipeOutBounded = false

                $this.startX = touchX(event)
                $this.startY = touchY(event)

                $this.currentX = 0
                $this.currentY = 0
            },
            touchMoveEvent = function (event) {
                var $this = this.$$touchObj

                $this.currentX = touchX(event)
                $this.currentY = touchY(event)

                if (!$this.touchMoved) {
                    var tapTolerance = options.tapTolerance

                    $this.touchMoved = Math.abs($this.startX - $this.currentX) > tapTolerance ||
                        Math.abs($this.startY - $this.currentY) > tapTolerance

                } else if (!$this.swipeOutBounded) {
                    var swipeOutBounded = options.swipeTolerance

                    $this.swipeOutBounded = Math.abs($this.startX - $this.currentX) > swipeOutBounded &&
                        Math.abs($this.startY - $this.currentY) > swipeOutBounded
                }
            },
            touchCancelEvent = function () {
                var $this = this.$$touchObj

                removeTouchClass(this)

                $this.touchStarted = $this.touchMoved = false
                $this.startX = $this.startY = 0
            },
            touchEndEvent = function () {
                var $this = this.$$touchObj

                $this.touchStarted = false

                removeTouchClass(this)

                if (!$this.touchMoved) {
                    // emit tap event
                    triggerEvent(event, this, 'tap')

                } else if (!$this.swipeOutBounded) {
                    var swipeOutBounded = options.swipeTolerance, direction

                    if (Math.abs($this.startX - $this.currentX) < swipeOutBounded) {
                        direction = $this.startY > $this.currentY ? "top" : "bottom"

                    } else {
                        direction = $this.startX > $this.currentX ? "left" : "right"
                    }

                    // Only emit the specified event when it has modifiers
                    if ($this.callbacks['swipe.' + direction]) {
                        triggerEvent(event, this, 'swipe.' + direction, direction)

                    } else {
                        // Emit a common event when it has no any modifier
                        triggerEvent(event, this, 'swipe', direction)
                    }
                }
            },
            clickEvent = function (event) {
                var $this = this.$$touchObj

                if (!$this.supportTouch && !options.disableClick) {
                    triggerEvent(event, this, 'tap')
                }
            },
            mouseEnterEvent = function () {
                addTouchClass(this)
            },
            mouseLeaveEvent = function () {
                removeTouchClass(this)
            },
            triggerEvent = function (e, $el, eventType, param) {
                var $this = $el.$$touchObj

                // get the callback list
                var callbacks = $this.callbacks[eventType] || []
                if (callbacks.length === 0) {
                    return null
                }

                for (var i = 0; i < callbacks.length; i++) {
                    var binding = callbacks[i]

                    // handle `self` modifier`
                    if (binding.modifiers.self && e.target !== e.currentTarget) {
                        continue
                    }

                    if (typeof binding.value === 'function') {
                        if (param) {
                            binding.value(param, e)
                        } else {
                            binding.value(e)
                        }
                    }
                }
            },
            addTouchClass = function ($el) {
                var className = $el.$$touchClass || options.touchClass
                $el.classList.add(className)
            },
            removeTouchClass = function ($el) {
                var className = $el.$$touchClass || options.touchClass
                $el.classList.remove(className)
            }


        Vue.directive('touch', {
            bind: function ($el, binding) {

                $el.$$touchObj = $el.$$touchObj || {
                        // will change to true when `touchstart` event first trigger
                        supportTouch: false,
                        // an object contains all callbacks registered,
                        // key is event name, value is an array
                        callbacks: {},
                        // prevent bind twice, set to true when event binded
                        hasBindTouchEvents: false
                    }


                // registe callback
                var eventType = binding.arg ? binding.arg : 'tap'
                if (eventType === 'swipe') {
                    var _m = binding.modifiers
                    if (_m.left || _m.right || _m.top || _m.bottom) {
                        for (var i in binding.modifiers) {
                            if (['left', 'right', 'top', 'bottom'].indexOf(i) >= 0) {
                                var _e = 'swipe.' + i
                                $el.$$touchObj.callbacks[_e] = $el.$$touchObj.callbacks[_e] || []
                                $el.$$touchObj.callbacks[_e].push(binding)
                            }
                        }
                    } else {
                        $el.$$touchObj.callbacks.swipe = $el.$$touchObj.callbacks.swipe || []
                        $el.$$touchObj.callbacks.swipe.push(binding)
                    }

                } else {
                    $el.$$touchObj.callbacks.tap = $el.$$touchObj.callbacks.tap || []
                    $el.$$touchObj.callbacks.tap.push(binding)
                }

                // prevent bind twice
                if ($el.$$touchObj.hasBindTouchEvents) {
                    return
                }

                $el.addEventListener('touchstart', touchStartEvent)
                $el.addEventListener('touchmove', touchMoveEvent)
                $el.addEventListener('touchcancel', touchCancelEvent)
                $el.addEventListener('touchend', touchEndEvent)

                if (!options.disableClick) {
                    $el.addEventListener('click', clickEvent)
                    $el.addEventListener('mouseenter', mouseEnterEvent)
                    $el.addEventListener('mouseleave', mouseLeaveEvent)
                }

                // set bind mark to true
                $el.$$touchObj.hasBindTouchEvents = true
            },

            unbind: function ($el) {
                $el.removeEventListener('touchstart', touchStartEvent)
                $el.removeEventListener('touchmove', touchMoveEvent)
                $el.removeEventListener('touchcancel', touchCancelEvent)
                $el.removeEventListener('touchend', touchEndEvent)

                if (!options.disableClick) {
                    $el.removeEventListener('click', clickEvent)
                    $el.removeEventListener('mouseenter', mouseEnterEvent)
                    $el.removeEventListener('mouseleave', mouseLeaveEvent)
                }

                // remove vars
                delete $el.$$touchObj
            }
        })

        Vue.directive('touch-class', {
            bind: function ($el, binding) {
                $el.$$touchClass = binding.value
            },
            unbind: function ($el) {
                delete $el.$$touchClass
            }
        })
    }
}


/*
 * Exports
 */
if (typeof module === 'object') {
    module.exports = vueTouchEvents

} else if (typeof define === 'function' && define.amd) {
    define([], function () {
        return vueTouchEvents
    })
} else if (window.Vue) {
    window.vueTouchEvents = vueTouchEvents
    Vue.use(vueTouchEvents)
}
