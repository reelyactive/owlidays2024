
/**
 * Copyright reelyActive 2024
 * We believe in an open Internet of Things
 */

class Debugging  {


    constructor(){
        this.show_levels = [];
        this.trace = false;
    }

    show(levels){
        const merge = (a, b, predicate = (a, b) => a === b) => {
            const c = [...a]; // copy to avoid side effects
            // add all items from B to copy C if they're not already present
            b.forEach((bItem) => (c.some((cItem) => predicate(bItem, cItem)) ? null : c.push(bItem)))
            return c;
        }
        this.show_levels = merge(this.levels,levels);

    }

    hide(level){
        this.show_levels = this.show_levels.filter( function( el ) {
            return !level.includes( el );
          } );
    }


    // console.log no matter waht
    prodlog(text){
        this.logl("prod", ...arguments);
    }

    log(text){
        this.logl(1, ...arguments);
    }



    // log w category or level information, so we can conditionally display certain log info and not other
    logl(level, text){
        var [level, ...rest] = arguments
        //level = arguments[0];
//        delete(arguments[0]);

        if(this.show_levels.includes(level)){
            console.log(...rest);
        }
        if(this.trace){
            console.trace();
        }
    }

}

module.exports = Debugging;