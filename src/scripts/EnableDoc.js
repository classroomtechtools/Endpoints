(function (__g__) {

  Object.defineProperty(Function.prototype, 'doc', {
    get: function () {
      const split = this.toString().split('\n');
      if (split.length === 0) return "";
      const docstrings = [split[0]];

      // grab the "docstring"
      if (split[1].includes('\*')) {
        // find the closing comment, +3 to where because of the offsets and open indice
        const where = split.slice(1).findIndex( txt => txt.includes('*/') );
        if (where !== -1) docstrings.push( ...split.slice(1, where+2) );
        docstrings.push('}');
      } else {
        docstrings.push('\t/* no docstring given */\n}');
      }
      return docstrings.join('\n');
    },
    configurable: true,
    enumerable: false,
  });

})(this);
