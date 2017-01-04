/*jshint unused:false */

(function (exports) {

    'use strict';

    var STORAGE_KEY = 'todos-vuejs';

    exports.todoStorage = {
        fetch: function () {
            return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
        },
        save: function (todos) {
            if( todos ) {
                localStorage.setItem( STORAGE_KEY, JSON.stringify( todos, function( key, value ) {
                    if( key === 'selected' || key === 'skipped' ) {
                        return undefined;
                    }

                    return value;
                } ) );
            }
        }
    };

})(window);